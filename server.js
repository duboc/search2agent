import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());



app.post('/api/chat', async (req, res) => {
  try {
    const { history, userMessage } = req.body;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    if (!projectId || projectId === 'seu-projeto-aqui') {
      throw new Error('GOOGLE_CLOUD_PROJECT não configurado no arquivo .env');
    }

    // We construct the client specifically for Vertex AI in the route definition
    // to ensure it grabs the latest environment variables if they change.
    const vertexAi = new GoogleGenAI({
      vertexai: {
        project: projectId,
        location: location
      }
    });

    const model = process.env.GEMINI_MODEL_ID || 'gemini-3.0-flash';

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

    // Set headers for Server-Sent Events (SSE) / streaming response
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

app.listen(port, () => {
  console.log(`Backend proxy listening at http://localhost:${port}`);
});
