import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, PhoneOff, AlertCircle } from 'lucide-react';
import { GeminiLiveAPI, MultimodalLiveResponseType } from '../api/geminiLiveApi';
import { AudioStreamer, AudioPlayer } from '../utils/audioStreamer';
import { BIA_VOICE_SYSTEM_INSTRUCTIONS } from '../api/prompts';

export default function VoiceAgentStage({ onEndCall }) {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const [messages, setMessages] = useState([]); // { text, role: 'user' | 'agent' | 'system' }
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const apiRef = useRef(null);
  const audioStreamerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Helper to add/append messages to the conversation
  const addMessage = (text, role, append = false) => {
    setMessages(prev => {
      if (append && prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + text };
        return updated;
      }
      return [...prev, { text, role, id: Date.now() + Math.random() }];
    });
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      let projectId = 'seu-projeto-aqui';
      let model = 'gemini-live-2.5-flash-native-audio';

      // Detect if running in production (same-origin) or dev (separate backend on port 3001)
      const isDev = window.location.hostname === 'localhost' && window.location.port !== '8080';
      const backendUrl = isDev ? `http://${window.location.hostname}:3001` : '';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = isDev ? `${window.location.hostname}:3001` : window.location.host;

      try {
        const configRes = await fetch(`${backendUrl}/api/config`);
        const config = await configRes.json();
        projectId = config.projectId;
        if (config.modelVoice) model = config.modelVoice;
        console.log('✅ Config loaded from backend:', { projectId, model });
      } catch (err) {
        console.warn('⚠️ Could not fetch config from backend, using defaults.', err);
      }

      if (cancelled) return;

      if (projectId === 'seu-projeto-aqui') {
        console.error('❌ Project ID is still the placeholder! Set GOOGLE_CLOUD_PROJECT in .env');
        setError('Project ID não configurado. Verifique o arquivo .env');
        setStatus('error');
        return;
      }

      const proxyUrl = `${wsProtocol}//${wsHost}/ws/gemini-live`;

      const api = new GeminiLiveAPI(proxyUrl, projectId, model);
      api.setSystemInstructions(BIA_VOICE_SYSTEM_INSTRUCTIONS);
      apiRef.current = api;

      audioPlayerRef.current = new AudioPlayer();
      await audioPlayerRef.current.init();

      if (cancelled) return;

      api.onConnectionStarted = () => {
        console.log('✅ Proxy connected, waiting for setup...');
      };

      api.onReceiveResponse = async (message) => {
        if (cancelled) return;
        switch (message.type) {
          case MultimodalLiveResponseType.SETUP_COMPLETE:
            console.log('✅ Gemini Live API Setup Complete!');
            setStatus('connected');
            addMessage('Chamada conectada', 'system');
            try {
              audioStreamerRef.current = new AudioStreamer(api);
              await audioStreamerRef.current.start();
              setIsListening(true);
            } catch (err) {
              setError('Não foi possível acessar seu microfone.');
              setStatus('error');
            }
            break;
          case MultimodalLiveResponseType.AUDIO:
            setIsSpeaking(true);
            if (audioPlayerRef.current) {
              audioPlayerRef.current.play(message.data);
            }
            break;
          case MultimodalLiveResponseType.TURN_COMPLETE:
            setIsSpeaking(false);
            break;
          case MultimodalLiveResponseType.INPUT_TRANSCRIPTION:
            if (message.data.text) {
              addMessage(message.data.text, 'user', true);
            }
            break;
          case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION:
            if (message.data.text) {
              addMessage(message.data.text, 'agent', true);
            }
            break;
          case MultimodalLiveResponseType.INTERRUPTED:
            setIsSpeaking(false);
            if (audioPlayerRef.current) {
              audioPlayerRef.current.interrupt();
            }
            break;
          default:
            break;
        }
      };

      api.onErrorMessage = (msg) => {
        console.error('❌ Gemini Live API Error:', msg);
        setError(msg);
        setStatus('error');
      };

      api.onClose = () => {
        console.log('🔌 Gemini Live API connection closed');
        if (!cancelled) setStatus('disconnected');
      };

      api.connect();
    };

    init();

    return () => {
      cancelled = true;
      if (apiRef.current) apiRef.current.disconnect();
      if (audioStreamerRef.current) audioStreamerRef.current.stop();
      if (audioPlayerRef.current) audioPlayerRef.current.destroy();
    };
  }, []);

  const handleEndCall = () => {
    if (onEndCall) onEndCall();
  };

  // Get last user text for the "listening" indicator
  const lastUserText = [...messages].reverse().find(m => m.role === 'user')?.text || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: '#1a1a1a', color: 'white',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px', zIndex: 1000, overflow: 'hidden'
      }}
    >
      {/* Visual Header */}
      <div style={{ marginTop: 30, textAlign: 'center', flexShrink: 0 }}>
        <h2 style={{ fontSize: '14px', letterSpacing: '2px', color: '#ff0033', fontWeight: 'bold', marginBottom: 8 }}>BIA LIVE</h2>
        <p style={{ fontSize: '12px', color: '#888' }}>CHAMADA SEGURA • BANCO BRADESCO</p>
      </div>

      {/* Main Avatar / Visualizer */}
      <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20, flexShrink: 0 }}>
        {/* Decorative Pulsing Circles */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
              style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #ff0033' }}
            />
          )}
          {isListening && !isSpeaking && (
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
              style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #1a73e8' }}
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
          style={{
            width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(45deg, #cc0000, #ff0033)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(255, 0, 51, 0.4)',
            zIndex: 2
          }}
        >
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', letterSpacing: '2px' }}>BIA</span>
        </motion.div>
      </div>

      {/* Listening indicator */}
      <div style={{ marginTop: 16, opacity: 0.6, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexShrink: 0 }}>
        <Mic size={14} color={isListening ? "#1a73e8" : "#888"} />
        <span>{status === 'connected' ? (isSpeaking ? 'BIA falando...' : 'Ouvindo...') : 'Conectando...'}</span>
      </div>

      {/* Conversation Transcription Area */}
      <div style={{
        marginTop: 20, flex: 1, width: '100%', maxWidth: '600px',
        overflowY: 'auto', padding: '0 10px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
      }}>
        {messages.length === 0 && status === 'connecting' && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 40, fontSize: '14px' }}>
            Estabelecendo conexão...
          </div>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : msg.role === 'system' ? 'center' : 'flex-start',
            }}
          >
            {msg.role === 'system' ? (
              <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>{msg.text}</span>
            ) : (
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: msg.role === 'user' ? '#1a73e8' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '14px',
                lineHeight: '1.5',
              }}>
                <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#ff0033', marginBottom: 4, fontWeight: 'bold' }}>
                  {msg.role === 'user' ? 'Você' : 'BIA'}
                </div>
                {msg.text}
              </div>
            )}
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Status & Errors */}
      {status === 'error' && (
        <div style={{ marginTop: '10px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', flexShrink: 0 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: 10, marginBottom: 30, display: 'flex', gap: '40px', flexShrink: 0 }}>
        <button
          onClick={handleEndCall}
          style={{
            width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ff3b30',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 59, 48, 0.3)'
          }}
        >
          <PhoneOff color="white" size={28} />
        </button>
      </div>
    </motion.div>
  );
}
