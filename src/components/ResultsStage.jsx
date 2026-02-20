import { motion } from 'framer-motion';
import { Search, Settings, Grid, User, ChevronRight } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

export default function ResultsStage({ query, onAdClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', backgroundColor: '#fff', paddingTop: '10px' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #ebebeb' }}>
        <img
          src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
          alt="Google"
          style={{ marginRight: '30px' }}
          width="92"
          height="30"
        />
        <div className="google-input-wrapper" style={{ margin: 0, padding: '5px 16px', maxWidth: '690px', borderRadius: '40px', boxShadow: '0 2px 5px 1px rgba(64,60,67,.16)', border: 'none' }}>
          <input
            type="text"
            className="google-input"
            value={query}
            readOnly
            style={{ fontSize: '16px' }}
          />
          <Search color="#4285f4" size={20} />
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', gap: '16px', color: '#5f6368' }}>
          <Settings size={22} />
          <Grid size={22} />
          <User size={22} color="#1a73e8" />
        </div>
      </header>

      <div style={{ borderBottom: '1px solid #ebebeb', padding: '12px 0 12px 148px', color: '#5f6368', fontSize: '13px' }}>
        Aproximadamente 1.450.000 resultados (0,32 segundos)
      </div>

      <div style={{ padding: '24px 148px', maxWidth: '800px' }}>

        {/* Sponsored Card */}
        <div className="serp-card serp-sponsored">
          <div className="sponsored-label">Patrocinado</div>
          <div className="serp-site-header">
            <div className="serp-favicon">
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>B</span>
            </div>
            <div className="serp-site-info">
              <div className="serp-site-name">banco.bradesco</div>
              <div className="serp-site-url">https://www.banco.bradesco › regularizacao</div>
            </div>
          </div>
          <h3 className="serp-title">Negocie suas dívidas com descontos de até 90%</h3>
          <p className="serp-desc">
            A BIA, nossa inteligência artificial, ajuda você a encontrar a melhor condição de pagamento para quitar sua dívida no Bradesco. Em poucos minutos, você simula o desconto para pagamento à vista ou o parcelamento em até 60x.
          </p>
          
          {/* Sitelink Extensions */}
          <div className="sitelink-extensions">
            <div className="sitelink-row" onClick={() => { trackEvent('sitelink_click', { type: 'text', label: 'Chat com a BIA' }); onAdClick('text'); }}>
              <div className="sitelink-content">
                <h4 className="sitelink-title">Chat com a BIA</h4>
                <p className="sitelink-desc">Negocie agora pelo chat com nossa inteligência artificial.</p>
              </div>
              <ChevronRight className="sitelink-chevron" size={22} />
            </div>
            <div className="sitelink-row" onClick={() => { trackEvent('sitelink_click', { type: 'voice', label: 'Falar com a BIA' }); onAdClick('voice'); }}>
              <div className="sitelink-content">
                <h4 className="sitelink-title">Falar com a BIA</h4>
                <p className="sitelink-desc">Ligue e negocie por voz com a assistente virtual do Bradesco.</p>
              </div>
              <ChevronRight className="sitelink-chevron" size={22} />
            </div>
          </div>
        </div>

        {/* Organic Result 1 */}
        <div className="serp-card" style={{ padding: '0 0 24px', marginBottom: 0 }}>
          <div className="serp-url">www.serasa.com.br › limpar-nome</div>
          <h3 className="serp-title" style={{ cursor: 'pointer' }}>Limpa Nome | Serasa</h3>
          <p className="serp-desc">
            Consulte seu CPF grátis e negocie suas dívidas pelo Serasa Limpa Nome. Descontos exclusivos para você voltar a ter crédito e realizar seus sonhos.
          </p>
        </div>

        {/* Organic Result 2 */}
        <div className="serp-card" style={{ padding: '0 0 24px', marginBottom: 0 }}>
          <div className="serp-url">www.gov.br › ptn › servicos › renegociar-dividas</div>
          <h3 className="serp-title" style={{ cursor: 'pointer' }}>Renegociação de Dívidas - Gov.br</h3>
          <p className="serp-desc">
            Saiba como renegociar suas dívidas por meio do portal Gov.br. Informações oficiais sobre o programa Desenrola Brasil e canais de atendimento direto.
          </p>
        </div>

      </div>
    </motion.div>
  );
}
