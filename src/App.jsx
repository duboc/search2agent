import { useState } from 'react';
import SearchStage from './components/SearchStage';
import ResultsStage from './components/ResultsStage';
import AgentStage from './components/AgentStage';
import VoiceAgentStage from './components/VoiceAgentStage';
import { AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { hasApiKey, setUseMock } from './api/geminiApi';
import { trackEvent } from './utils/analytics';

function App() {
  const [stage, setStage] = useState('search'); // 'search' | 'results' | 'agent' | 'voice-agent'
  const [query, setQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleSearch = (q) => {
    trackEvent('search_performed', { query: q });
    setQuery(q);
    setStage('results');
  };

  const handleAdClick = (type = 'text') => {
    trackEvent('ad_click', { type });
    if (type === 'voice') {
      setStage('voice-agent');
    } else {
      setStage('agent');
    }
  };

  const handleBackToResults = () => {
    setStage('results');
  };

  return (
    <>
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999 }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'white', border: '1px solid #ccc', borderRadius: '50%',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Settings size={20} color="#555" />
        </button>
        {showSettings && (
          <div style={{
            position: 'absolute', bottom: 50, right: 0, background: 'white',
            padding: 20, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            width: 300
          }}>
            <h4 style={{ marginBottom: 10 }}>Backend Settings</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              Toggle between the local mock generator and real Vertex AI backend.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 15, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!hasApiKey()}
                onChange={(e) => {
                  setUseMock(e.target.checked);
                  setShowSettings(false);
                }}
                style={{ marginRight: 8 }}
              />
              <span style={{ fontSize: 14 }}>Use Mock Responses</span>
            </label>
            <div style={{ fontSize: 12, color: hasApiKey() ? 'green' : 'gray' }}>
              {hasApiKey() ? 'Status: Using Real Backend' : 'Status: Using Mock Stream'}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {stage === 'search' && (
          <SearchStage key="search" onSearch={handleSearch} />
        )}
        {stage === 'results' && (
          <ResultsStage key="results" query={query} onAdClick={handleAdClick} />
        )}
        {stage === 'agent' && (
          <AgentStage key="agent" />
        )}
        {stage === 'voice-agent' && (
          <VoiceAgentStage key="voice" onEndCall={handleBackToResults} />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
