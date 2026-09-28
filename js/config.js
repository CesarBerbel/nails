/* =========================================================
   CONFIGURAÇÃO — edite aqui (usado pelo site e pelo painel)
   ========================================================= */
const CONFIG = {
  brand: "Helen Regiani Nails",
  ownerName: "Helen",
  city: "Coimbra, Portugal",
  // WhatsApp com código do país, só dígitos (351 = Portugal)
  whatsapp: "351914930793",
  instagram: "https://www.instagram.com/helenregianinails/",
  email: "helenregiani25@gmail.com",
  timezone: "Europe/Lisbon",

  // Supabase (Project Settings → API). A "anon key" é pública, pode ficar aqui.
  // Se ficar vazio, o site funciona como antes: sem login, sem unhas guardadas e sem rastreamento.
  supabase: {
    url: "",
    anonKey: "",
  },

  maxSavedDesigns: 5,
  // Mostrar o convite do onboarding na primeira visita (segundos depois de abrir o site; 0 = não mostrar)
  onboardingInviteDelay: 6,

  // Serviços. Para mostrar preço num cartão, adiciona por ex.: price: "15 €"
  services: [
    { cat: "naturais", icon: "💅", name: "Manicure", short: "Clássica e elegante.", details: "Cuidado e embelezamento das unhas naturais, com preparação, tratamento das cutículas e acabamento com verniz tradicional." },
    { cat: "naturais", icon: "💅", name: "Verniz gel", short: "Mais durabilidade e brilho.", details: "Maior durabilidade e brilho, mantendo um acabamento elegante nas unhas naturais." },
    { cat: "fortalecimento", icon: "🛡️", name: "Blindagem das unhas", short: "Proteção para unhas frágeis.", details: "Técnica de fortalecimento da unha natural, indicada para ajudar a proteger unhas frágeis e quebradiças." },
    { cat: "fortalecimento", icon: "💎", name: "Banho de gel", short: "Resistência e estrutura.", details: "Aplicação de gel sobre a unha natural para proporcionar maior resistência, estrutura e durabilidade." },
    { cat: "extensao", icon: "✨", name: "Extensão em gel", short: "O comprimento e formato que desejas.", details: "Alongamento das unhas com gel, permitindo criar o comprimento e o formato desejados." },
    { cat: "extensao", icon: "🌸", name: "Manutenção de extensão", short: "Extensão sempre impecável.", details: "Manutenção das unhas alongadas, com reposição e correção do crescimento da unha natural." },
    { cat: "nailart", icon: "🎨", name: "Nail Art e decoração", short: "Personalizada ao teu gosto.", details: "Detalhes e decorações adaptados ao gosto de cada cliente, desde estilos minimalistas e delicados até propostas mais elaboradas." },
  ],
};
