import { motion } from 'framer-motion';
import { Search, Settings, Grid, User } from 'lucide-react';

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
        <div
          className="serp-card serp-sponsored"
          onClick={onAdClick}
        >
          <div className="sponsored-label">Patrocinado</div>
          <div className="serp-url">banco.bradesco › regularizacao-de-dividas</div>
          <h3 className="serp-title">Negocie suas dívidas com descontos de até 90%</h3>
          <p className="serp-desc">
            A BIA, nossa inteligência artificial, ajuda você a encontrar a melhor condição de pagamento para quitar sua dívida no Bradesco. Em poucos minutos, você simula o desconto para pagamento à vista ou o parcelamento em até 60x.
          </p>
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
