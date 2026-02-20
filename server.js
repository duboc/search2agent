import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In production, serve the Vite-built frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Endpoint to provide public config to frontend
app.get('/api/config', (req, res) => {
  res.json({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'seu-projeto-aqui',
    locationText: process.env.GOOGLE_CLOUD_LOCATION_TEXT || 'global',
    locationVoice: process.env.GOOGLE_CLOUD_LOCATION_VOICE || 'us-central1',
    modelText: process.env.GEMINI_MODEL_ID_TEXT || 'gemini-3-flash-preview',
    modelVoice: process.env.GEMINI_MODEL_ID_VOICE || 'gemini-live-2.5-flash-native-audio'
  });
});

// Create standard HTTP server to wrap express app
const server = createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ noServer: true });

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

/**
 * WebSocket Proxy for Gemini Multimodal Live API
 */
wss.on('connection', async (ws) => {
  console.log('✅ Client connected to Gemini Live Proxy');
  let googleWs = null;
  let messageQueue = [];

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      // If this is the initial setup message from GeminiLiveAPI client
      if (message.service_url && !googleWs) {
        console.log('🔗 Connecting to Google Gemini Live API:', message.service_url);
        
        try {
          const client = await auth.getClient();
          const accessToken = await client.getAccessToken();
          const token = accessToken.token;
          console.log('🔑 Got access token (first 20 chars):', token?.substring(0, 20) + '...');

          const googleUrl = `${message.service_url}?access_token=${token}`;
          googleWs = new WebSocket(googleUrl);

          googleWs.on('open', () => {
            console.log('✅ Connected to Google upstream');
            // Send any queued messages
            while (messageQueue.length > 0) {
              const queuedData = messageQueue.shift();
              // Log setup message details (but truncate long content)
              try {
                const parsed = JSON.parse(queuedData);
                if (parsed.setup) {
                  console.log('📤 Sending queued setup to Google. Model:', parsed.setup.model);
                } else {
                  console.log('📤 Sending queued message to Google');
                }
              } catch(e) {
                console.log('📤 Sending queued binary data to Google');
              }
              googleWs.send(queuedData);
            }
          });

          googleWs.on('message', (googleData) => {
            // Forward message from Google to the frontend client
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(googleData.toString());
            }
          });

          googleWs.on('close', (code, reason) => {
            const reasonStr = reason ? reason.toString() : 'no reason';
            console.log(`❌ Google upstream closed — code: ${code}, reason: ${reasonStr}`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          });

          googleWs.on('error', (err) => {
            console.error('❌ Google upstream error:', err.message || err);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          });

        } catch (error) {
          console.error('❌ Failed to connect to Google:', error.message || error);
          ws.close();
        }
        return;
      }

      // Forward subsequent messages to Google
      if (googleWs && googleWs.readyState === WebSocket.OPEN) {
        googleWs.send(data.toString());
      } else {
        console.warn('⏳ Google connection not ready, queuing message');
        messageQueue.push(data.toString());
      }

    } catch (error) {
      // If it's not JSON, it might be binary (audio)
      if (googleWs && googleWs.readyState === WebSocket.OPEN) {
        googleWs.send(data);
      } else {
        console.warn('⏳ Google connection not ready, queuing binary message');
        messageQueue.push(data);
      }
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected from Proxy');
    if (googleWs && googleWs.readyState === WebSocket.OPEN) {
      googleWs.close();
    }
    googleWs = null;
  });
});

// Upgrade HTTP connection to WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws/gemini-live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

/**
 * Standard Chat API (Text-based)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { history, userMessage } = req.body;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION_TEXT || 'global';

    if (!projectId || projectId === 'seu-projeto-aqui') {
      throw new Error('GOOGLE_CLOUD_PROJECT não configurado no arquivo .env');
    }

    const vertexAi = new GoogleGenAI({
      vertexai: {
        project: projectId,
        location: location
      }
    });

    const model = process.env.GEMINI_MODEL_ID_TEXT || 'gemini-3-flash-preview';

    const formattedHistory = history.map(msg => ({
      role: msg.role === 'agent' ? 'model' : 'user',
      parts: [{ text: msg.rawContent || msg.content }]
    }));

    const responseStream = await vertexAi.models.generateContentStream({
      model: model,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: `Você é a BIA, a inteligência artificial do Banco Bradesco especializada em negociação de dívidas.
Sua interface não é um simples chatbox; é uma experiência minimalista rica e imersiva.
Para isso, você OBRIGATORIAMENTE deve retornar os dados para renderização dos gráficos e elementos interativos da interface em um bloco JSON válido no formato markdown \`\`\`json (finalizando com \`\`\`), SEMPRE no final de sua resposta.

Formato OBRIGATÓRIO de todas as respostas:
[Seu texto falado aqui. Use tom humano, empático e resolutivo.]

\`\`\`json
{
  "uiElement": "none" | "auth_cpf" | "auth_sms" | "debt_summary" | "simulation" | "payment_pix" | "auth_generic_input",
  "uiData": { ... },
  "quickReplies": ["Opção 1", "Opção 2"]
}
\`\`\`

FASES DA JORNADA (Siga OBRIGATORIAMENTE esta ordem):
1. Início: Comece com empatia. Peça o CPF do cliente. uiElement: "auth_cpf".
2. Autenticação SMS: Após o CPF, finja enviar SMS e peça os 4 números. uiElement: "auth_sms".
3. Consulta de Dívidas: Após a senha, mostre valores pendentes de forma realista (ex: Cartão Visa e Cheque Especial). uiElement: "debt_summary" com uiData: {"total": 4500, "debts": [{"name": "Cartão Visa", "value": 3000}, {"name": "Cheque Especial", "value": 1500}]}. Pergunte se quer pagar à vista (com 90% de desconto) ou parcelar.
4. Entrada: Se quiser parcelar, peça o valor de entrada desejado.
5. Simulação (Cenário Parcelado): Após receber o valor da entrada, mostre opções. uiElement: "simulation", uiData: {"options": [{"installments": 12, "value": 235}, {"installments": 24, "value": 130}, {"installments": 36, "value": 95}]}.
6. Formalização: Após escolher opção (ou à vista), peça a senha de 4 dígitos do cartão para formalizar. uiElement: "auth_generic_input".
7. Conclusão: Gere o código PIX. uiElement: "payment_pix", uiData: {"pixCode": "0002010102112636br.gov.bcb.pix0114+5511999999999520400005303986540510.005802BR5915BANCO BRADESCO6009SAO PAULO62070503***6304A1B2"}. Informe sobre prazo de 5 dias úteis para limpar o nome.`,
        temperature: 0.2
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    res.end();

  } catch (error) {
    console.error("Vertex AI Error:", error);
    res.status(500).send("Desculpe, enfrentei um problema técnico ao conectar com meus sistemas. Vamos tentar novamente?\n\n```json\n{\"uiElement\":\"none\",\"uiData\":{},\"quickReplies\":[\"Tentar Novamente\"]}\n```");
  }
});

// In production, catch-all route serves the SPA
if (process.env.NODE_ENV === 'production') {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend proxy (Chat + Live) listening on 0.0.0.0:${port}`);
});
