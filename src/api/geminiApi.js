let _useMock = localStorage.getItem('USE_MOCK') !== 'false';

export const setUseMock = (useMock) => {
  _useMock = useMock;
  localStorage.setItem('USE_MOCK', useMock ? 'true' : 'false');
};

export const hasApiKey = () => !_useMock; // Keeping signature to avoid breaking UI

const mockStreamResponse = async function* (text) {
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise(r => setTimeout(r, 40));
    yield words[i] + (i < words.length - 1 ? " " : "");
  }
};

const getMockResponse = (history) => {
  const step = history.length;
  if (step === 0) {
    return `Olá! Sou a BIA, a inteligência artificial do Bradesco.É muito bom ter você por aqui! 🌟\nPara começarmos e eu garantir a segurança das suas informações, por favor, digite o seu CPF.\n\n\`\`\`json\n{"uiElement":"auth_cpf","uiData":{},"quickReplies":[]}\n\`\`\``;
  }
  if (step === 2) {
    return `Obrigada! Só para confirmar que é você mesmo, enviei um código de segurança por SMS para o seu celular terminado em -45. Pode digitar os 4 números aqui para mim? 🔒\n\n\`\`\`json\n{"uiElement":"auth_sms","uiData":{},"quickReplies":[]}\n\`\`\``;
  }
  if (step === 4) {
    return `Autenticação confirmada! ✅\nVerifiquei aqui no sistema e vi que você tem alguns valores pendentes.\nMas não se preocupe, estamos aqui para resolver isso juntos! O que você prefere fazer?\n\n\`\`\`json\n{"uiElement":"debt_summary","uiData":{"total":4500,"debts":[{"name":"Cartão de Crédito Visa","value":3000},{"name":"Limite Cheque Especial","value":1500}]},"quickReplies":["Pagar à vista com desconto","Ver opções de parcelamento"]}\n\`\`\``;
  }
  if (step === 6) {
    return `Ótima escolha! Unificando as dívidas, eu consigo montar um parcelamento bem bacana para você.\nPara simularmos, qual valor você gostaria de dar como entrada hoje?\n\n\`\`\`json\n{"uiElement":"none","uiData":{},"quickReplies":["R$ 150","R$ 300","R$ 500"]}\n\`\`\``;
  }
  if (step === 8) {
    return `Combinado! Com essa entrada estipulada, o saldo restante fica bem mais leve. Veja as opções de parcelamento que separei para você:\n\n\`\`\`json\n{"uiElement":"simulation","uiData":{"options":[{"installments":12,"value":235},{"installments":24,"value":130},{"installments":36,"value":95}]},"quickReplies":[]}\n\`\`\``;
  }
  if (step === 10) {
    return `Excelente! Para fecharmos o seu acordo, por favor digite a sua senha de 4 dígitos (aquela que você usa na maquininha).\n\n\`\`\`json\n{"uiElement":"auth_generic_input","uiData":{},"quickReplies":[]}\n\`\`\``;
  }
  return `Acordo fechado com sucesso! 🎉🤝\nAqui está o seu código PIX para o pagamento inicial. \n⚠️ Lembrando: O acordo só passa a valer após o pagamento da entrada. Seu nome será regularizado nos órgãos de proteção em até 5 dias úteis. Posso ajudar com algo mais?\n\n\`\`\`json\n{"uiElement":"payment_pix","uiData":{"pixCode":"0002010102112636br.gov.bcb.pix0114+5511999999999520400005303986540510.005802BR5915BANCO BRADESCO6009SAO PAULO62070503***6304A1B2"},"quickReplies":["Não, era só isso. Obrigado!"]}\n\`\`\``;
};

export async function* sendMessageStream(history, userMessage) {
  if (_useMock) {
    const response = getMockResponse(history);
    yield* mockStreamResponse(response);
    return;
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, userMessage })
    });

    if (!res.ok) throw new Error("Backend error: " + res.status);

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value, { stream: true });
      yield chunkText;
    }
  } catch (err) {
    console.error("Gemini API Error:", err);
    yield "Desculpe, enfrentei um problema técnico ao conectar com meus sistemas. Vamos tentar novamente?\n\n```json\n{\"uiElement\":\"none\",\"uiData\":{},\"quickReplies\":[\"Tentar Novamente\"]}\n```";
  }
}

