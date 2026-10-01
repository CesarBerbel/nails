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
    url: "https://bukzxdqtjcmevvshzyoi.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a3p4ZHF0amNtZXZ2c2h6eW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTc1OTksImV4cCI6MjEwNjE3MzU5OX0.fusR9UFADJ8oxzq1gwqfmsmlKTPMCaDiTRiukbs7joA",
  },

  // Client ID do Google (Google Cloud → Clients). É público. Ativa o popup "Continuar como …" (One Tap).
  googleClientId: "674352229670-qqauqqdo5nos3sgu15sq9mofdpr8e1ig.apps.googleusercontent.com",

  maxSavedDesigns: 5,
  // Mostrar o convite do onboarding na primeira visita (segundos depois de abrir o site; 0 = não mostrar)
  onboardingInviteDelay: 6,

  // Serviços. Para mostrar preço num cartão, adiciona por ex.: price: "15 €"
  // "en": os mesmos textos na versão inglesa do site (/en/)
  services: [
    { cat: "naturais", icon: "💅", name: "Manicure", short: "Clássica e elegante.", details: "Cuidado e embelezamento das unhas naturais, com preparação, tratamento das cutículas e acabamento com verniz tradicional.",
      en: { name: "Manicure", short: "Classic and elegant.", details: "Care and beautification of natural nails, with preparation, cuticle treatment and a classic polish finish." } },
    { cat: "naturais", icon: "💅", name: "Verniz gel", short: "Mais durabilidade e brilho.", details: "Maior durabilidade e brilho, mantendo um acabamento elegante nas unhas naturais.",
      en: { name: "Gel polish", short: "Longer-lasting shine.", details: "Longer wear and more shine, with an elegant finish on natural nails." } },
    { cat: "fortalecimento", icon: "🛡️", name: "Blindagem das unhas", short: "Proteção para unhas frágeis.", details: "Técnica de fortalecimento da unha natural, indicada para ajudar a proteger unhas frágeis e quebradiças.",
      en: { name: "Nail strengthening", short: "Protection for fragile nails.", details: "A strengthening technique for the natural nail, ideal for helping to protect fragile, brittle nails." } },
    { cat: "fortalecimento", icon: "💎", name: "Banho de gel", short: "Resistência e estrutura.", details: "Aplicação de gel sobre a unha natural para proporcionar maior resistência, estrutura e durabilidade.",
      en: { name: "Gel overlay", short: "Strength and structure.", details: "Gel applied over the natural nail for extra strength, structure and durability." } },
    { cat: "extensao", icon: "✨", name: "Extensão em gel", short: "O comprimento e formato que desejas.", details: "Alongamento das unhas com gel, permitindo criar o comprimento e o formato desejados.",
      en: { name: "Gel extensions", short: "The length and shape you want.", details: "Nail lengthening with gel, so you can have the length and shape you want." } },
    { cat: "extensao", icon: "🌸", name: "Manutenção de extensão", short: "Extensão sempre impecável.", details: "Manutenção das unhas alongadas, com reposição e correção do crescimento da unha natural.",
      en: { name: "Extension infill", short: "Extensions always flawless.", details: "Maintenance of extended nails, filling in and correcting the natural nail growth." } },
    { cat: "nailart", icon: "🎨", name: "Nail Art e decoração", short: "Personalizada ao teu gosto.", details: "Detalhes e decorações adaptados ao gosto de cada cliente, desde estilos minimalistas e delicados até propostas mais elaboradas.",
      en: { name: "Nail art and decoration", short: "Personalised to your taste.", details: "Details and decorations tailored to each client, from minimal and delicate styles to more elaborate designs." } },
  ],
};
