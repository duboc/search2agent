import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SearchStage({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{ paddingBottom: '20px' }}>
        <img 
          src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" 
          alt="Google" 
          width="272" 
          height="92" 
          style={{ marginBottom: '20px' }}
        />
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="google-input-wrapper">
          <Search color="#9aa0a6" size={20} style={{ marginRight: '10px' }} />
          <input
            type="text"
            className="google-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <button type="submit" className="google-btn">Pesquisa Google</button>
          <button type="button" className="google-btn">Estou com sorte</button>
        </div>
      </form>

      <div style={{ marginTop: '30px', fontSize: '13px', color: '#4d5156' }}>
        Disponibilizado pelo Google em: <a href="#" style={{ color: '#1a0dab', textDecoration: 'none' }}>English</a>
      </div>
    </motion.div>
  );
}
