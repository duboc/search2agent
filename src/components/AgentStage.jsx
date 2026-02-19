import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Menu, Copy, CheckCircle2, ShieldCheck, ChevronRight, Lock } from 'lucide-react';
import { sendMessageStream } from '../api/geminiApi';

export default function AgentStage() {
  const [messages, setMessages] = useState([]);
  const [inputLocal, setInputLocal] = useState(''); // Used for inline cards
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    handleSend('', true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text, isInitial = false) => {
    // If text is provided, use it (from a quick reply or inline card submitting)
    const userText = isInitial ? '' : text;

    if (!isInitial && !userText.trim()) return;

    if (!isInitial) {
      setMessages(prev => [...prev, { role: 'user', content: userText, rawContent: userText }]);
      setQuickReplies([]);
    }

    setIsTyping(true);
    let agentMessage = '';

    setMessages(prev => [...prev, { role: 'agent', content: '', rawContent: '', uiElement: 'none', uiData: {} }]);

    const stream = sendMessageStream(messages, userText || 'Oi, BIA.');

    for await (const chunk of stream) {
      agentMessage += chunk;

      // Clean up the text part by removing the JSON code block for display
      let textPart = agentMessage;
      const jsonRegex = new RegExp('\`\`\`json([\\s\\S]*?)\`\`\`');
      const jsonMatch = agentMessage.match(jsonRegex);
      if (jsonMatch) {
        textPart = agentMessage.replace(jsonMatch[0], '');
      }

      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = textPart.trim();
        newMsgs[newMsgs.length - 1].rawContent = agentMessage;
        return newMsgs;
      });
    }

    // Final parse of the JSON block once the message is complete
    const finalJsonRegex = new RegExp('\`\`\`json([\\s\\S]*?)\`\`\`');
    const finalJsonMatch = agentMessage.match(finalJsonRegex);
    if (finalJsonMatch) {
      try {
        const data = JSON.parse(finalJsonMatch[1].trim());
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].uiElement = data.uiElement || 'none';
          newMsgs[newMsgs.length - 1].uiData = data.uiData || {};
          return newMsgs;
        });
        if (data.quickReplies && data.quickReplies.length > 0) {
          setQuickReplies(data.quickReplies);
        }
      } catch (e) {
        console.error("Failed to parse JSON", e);
      }
    }

    setIsTyping(false);
  };

  const renderUiElement = (element, data, msgIdx) => {
    if (!element || element === 'none') return null;

    // Check if this is the newest message to see if we should enable inputs
    const isLatest = msgIdx === messages.length - 1 && !isTyping;

    if (element === 'auth_cpf') {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card input-card">
          <div className="input-card-header">
            <ShieldCheck color="#2B2D42" size={20} />
            <span>Confirmação de Identidade</span>
          </div>
          <form
            className="auth-form-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (inputLocal.trim()) {
                handleSend(inputLocal);
                setInputLocal('');
              }
            }}
          >
            <input
              className="auth-input-field"
              placeholder="Digite seu CPF (apenas números)"
              type="tel"
              value={isLatest ? inputLocal : (data.submitted || '***.***.***-**')}
              onChange={(e) => setInputLocal(e.target.value)}
              disabled={!isLatest}
              autoFocus={isLatest}
            />
            <button
              type="submit"
              className={"auth-submit-btn " + (!isLatest ? "disabled-btn" : "")}
              disabled={!isLatest || !inputLocal.trim()}
            >
              Enviar
            </button>
          </form>
          <div className="input-card-footer">Ambiente Seguro Bradesco</div>
        </motion.div>
      );
    }

    if (element === 'auth_sms') {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card input-card">
          <div className="input-card-header">
            <Lock color="#2B2D42" size={20} />
            <span>Autenticação SMS</span>
          </div>
          <form
            className="auth-form-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (inputLocal.trim()) {
                handleSend(inputLocal);
                setInputLocal('');
              }
            }}
          >
            <input
              className="auth-input-field"
              placeholder="4 dígitos"
              type="tel"
              maxLength={4}
              value={isLatest ? inputLocal : '****'}
              onChange={(e) => setInputLocal(e.target.value)}
              disabled={!isLatest}
              autoFocus={isLatest}
            />
            <button
              type="submit"
              className={"auth-submit-btn " + (!isLatest ? "disabled-btn" : "")}
              disabled={!isLatest || !inputLocal.trim()}
            >
              Enviar
            </button>
          </form>
          <div className="input-card-footer">Enviado para (11) *****-1234</div>
        </motion.div>
      );
    }

    if (element === 'debt_summary') {
      const debts = data.debts || [];
      const total = data.total || 0;
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card">
          <div className="card-header">
            <ShieldCheck color="#2B2D42" size={20} />
            <span>Resumo de Pendências</span>
          </div>
          {debts.map((d, i) => (
            <div key={i} className="debt-row">
              <span>{d.name}</span>
              <strong>R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          ))}
          <div className="debt-total">
            <span>Total Atualizado</span>
            <h3>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </motion.div>
      );
    }

    if (element === 'simulation') {
      const options = data.options || [];
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card simulation-card">
          <h4>Opções de Parcelamento</h4>
          {options.map((opt, i) => (
            <div key={i} className="simulation-option" onClick={() => isLatest && handleSend(opt.installments + 'x de R$ ' + opt.value)}>
              <div>
                <span className="installments">{opt.installments}x</span> de <strong className="value">R$ {opt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <ChevronRight size={18} color={isLatest ? "#cc092f" : "#ccc"} />
            </div>
          ))}
        </motion.div>
      );
    }

    if (element === 'payment_pix') {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card pix-card">
          <img src="https://logospng.org/download/pix/logo-pix-icone-1024.png" alt="Pix" style={{ width: 24, marginBottom: 12 }} />
          <h4>Pagamento via PIX Copia e Cola</h4>
          <div className="pix-code-box">
            {data.pixCode || "0002010102112636br.gov.bcb...."}
          </div>
          <button className="copy-btn" onClick={(e) => {
            navigator.clipboard.writeText(data.pixCode || "");
            e.target.innerText = "Copiado!";
            setTimeout(() => e.target.innerText = "Copiar Código", 2000);
          }}>
            <Copy size={16} style={{ marginRight: 8 }} />
            Copiar Código
          </button>
        </motion.div>
      );
    }

    if (element === 'auth_generic_input') {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rich-card input-card">
          <form
            className="auth-form-row"
            style={{ marginTop: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (inputLocal.trim()) {
                handleSend(inputLocal);
                setInputLocal('');
              }
            }}
          >
            <input
              className="auth-input-field"
              placeholder="Digite sua resposta..."
              type="text"
              value={isLatest ? inputLocal : (data.submitted || '********')}
              onChange={(e) => setInputLocal(e.target.value)}
              disabled={!isLatest}
              autoFocus={isLatest}
            />
            <button
              type="submit"
              className={"auth-submit-btn " + (!isLatest ? "disabled-btn" : "")}
              disabled={!isLatest || !inputLocal.trim()}
            >
              Enviar
            </button>
          </form>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="agent-container">
      <header className="agent-header">
        <div className="agent-logo">Bradesco BIA</div>
        <Menu color="#2B2D42" size={24} style={{ cursor: 'pointer' }} />
      </header>

      <main className="agent-core">
        {messages.length === 0 ? (
          <h2 className="agent-message-lead">
            Sua negociação, feita para você de um jeito diferente.
          </h2>
        ) : (
          <div className="agent-chat-history">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={"message-wrapper " + (msg.role === 'agent' ? 'wrapper-agent' : 'wrapper-user')}
                >
                  {msg.content && (
                    <div className="message-node">
                      {msg.role === 'agent' && (
                        <div className="agent-badge">
                          ✨ BIA
                        </div>
                      )}
                      <div className={msg.role === 'agent' ? 'message-agent' : 'message-user'}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {msg.role === 'agent' && msg.uiElement && msg.uiElement !== 'none' && (
                    <div className="ui-container">
                      {renderUiElement(msg.uiElement, msg.uiData, idx)}
                    </div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="message-wrapper wrapper-agent">
                  <div className="message-node">
                    <div className="agent-badge">
                      ✨ BIA
                    </div>
                    <div className="message-agent">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Floating Quick Replies */}
        {messages.length > 0 && quickReplies.length > 0 && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="user-quick-replies"
          >
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                className="quick-reply-btn"
                onClick={() => handleSend(reply)}
              >
                {reply}
              </button>
            ))}
          </motion.div>
        )}
      </main>

      {/* The global input is hidden via CSS, but we keep it here for backwards compatibility if needed */}
      <div className="agent-input-container">
        <input className="agent-input" type="text" />
      </div>
    </div>
  );
}
