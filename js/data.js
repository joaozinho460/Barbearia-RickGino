/*
 * ============================================================
 *  Barbearia RickGino — Conteúdo editável do site
 * ============================================================
 *  Todo o conteúdo do site está aqui, centralizado, para que
 *  possas alterar textos, preços, fotos, horários e equipa
 *  sem mexer no resto do código.
 * ============================================================
 */

window.SITE_DATA = {

  /* -------------------------------------------------- */
  /*  NEGÓCIO                                            */
  /* -------------------------------------------------- */
  business: {
    name: "Barbearia RickGino",
    shortName: "RickGino",
    tagline: "Onde o estilo ganha forma",
    description:
      "Barbearia premium em Setúbal. Cortes modernos, barba tradicional, coloração e tratamentos — executados por uma equipa de barbeiros com técnica e atenção ao detalhe.",
    // Morada pública encontrada
    addressLine1: "R. Dr. António Manuel Gamito 2",
    addressLine2: "2900-481 Setúbal",
    city: "Setúbal",
    country: "Portugal",
    // Telefone
    phoneDisplay: "+351 934 892 154",
    phoneTel: "+351934892154",
    whatsapp: "351934892154",
    // Instagram
    instagramUrl: "https://www.instagram.com/barbearia_rickgino/",
    instagramHandle: "@barbearia_rickgino",
    // Google
    googleStars: 4.8,
    googleReviews: 63,
    // Email de contacto (editar quando existir)
    email: "contacto@barbeariarickgino.pt",
    // URL pública do site (editar quando estiver online)
    siteUrl: "https://www.barbeariarickgino.pt",
    // Imagens (editáveis)
    heroImage: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1800&auto=format&fit=crop",
    aboutImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop",
  },

  /* -------------------------------------------------- */
  /*  HORÁRIO DA LOJA (secção Horários)                  */
  /* -------------------------------------------------- */
  schedule: {
    monday: "09:00 – 19:00",
    tuesday: "09:00 – 19:00",
    wednesday: "09:00 – 19:00",
    thursday: "09:00 – 19:00",
    friday: "09:00 – 19:00",
    saturday: "09:00 – 19:00",
    sunday: "Encerrado",
    note: "Aberto de segunda a sábado",
  },

  /* -------------------------------------------------- */
  /*  HORÁRIOS DISPONÍVEIS PARA MARCAÇÃO                 */
  /*  (o sistema consulta o Supabase antes de confirmar) */
  /* -------------------------------------------------- */
  bookingSlots: [
    "09:00", "09:30",
    "10:00", "10:30",
    "11:00", "11:30",
    "14:00", "14:30",
    "15:00", "15:30",
    "16:00", "16:30",
    "17:00", "17:30",
    "18:00", "18:30",
    "19:00",
  ],

  // Quantos dias à frente podem ser marcados
  bookingDaysAhead: 14,
  // Dias da semana fechados (0 = domingo, 6 = sábado)
  bookingClosedWeekdays: [0],

  /* -------------------------------------------------- */
  /*  SERVIÇOS — configuração central e editável         */
  /*  icon: nome de um ícone SVG do set definido em main  */
  /* -------------------------------------------------- */
  services: [
    { id: "corte",           name: "Corte",                         price: 15, duration: 40, icon: "scissors", desc: "Corte clássico ou moderno, ajustado à tua estrutura e estilo." },
    { id: "corte-barba",     name: "Corte + Barba",                 price: 22, duration: 60, icon: "razor",    desc: "O combo completo para quem quer sair renovado de alto a baixo." },
    { id: "corte-sobranc",   name: "Corte + Sobrancelha",           price: 18, duration: 50, icon: "scissors", desc: "Corte com acabamento cuidado e sobrancelha desenhada." },
    { id: "sobrancelha",     name: "Sobrancelha",                   price: 7,  duration: 15, icon: "brow",     desc: "Limpeza e definição com precisão milimétrica." },
    { id: "barba",           name: "Barba",                         price: 10, duration: 30, icon: "razor",    desc: "Barba feita à navalha ou máquina, com acabamento perfeito." },
    { id: "barba-toalha",    name: "Barba com toalha quente",       price: 12, duration: 35, icon: "steam",    desc: "Toalha quente para abrir os poros e uma barba impecável." },
    { id: "barba-contorno",  name: "Barba + Contorno",              price: 11, duration: 35, icon: "razor",    desc: "Barba esculpida com contorno definido." },
    { id: "barba-cont-sob",  name: "Barba + Contorno + Sobrancelha", price: 13, duration: 40, icon: "brow",     desc: "O pacote completo de rosto: barba, contorno e sobrancelha." },
    { id: "corte-bar-sob",   name: "Corte + Barba + Sobrancelha",   price: 24, duration: 70, icon: "scissors", desc: "Tudo em dia, num só serviço." },
    { id: "corte-bar-toalha", name: "Corte + Barba com toalha quente", price: 25, duration: 75, icon: "steam", desc: "Corte, barba com toalha quente e acabamento de luxo." },
    { id: "manutencao",      name: "Manutenção / Prótese",          price: 25, duration: 60, icon: "clip",     desc: "Manutenção de corte ou instalação/ajuste de prótese capilar." },
    { id: "corte-bar-nasal", name: "Corte + Barba + Depilação Nasal", price: 27, duration: 75, icon: "razor", desc: "Combo completo com depilação nasal higiénica." },
    { id: "corte-pintura",   name: "Corte + Pintura",               price: 30, duration: 90, icon: "color",    desc: "Corte com pintura para cobrir brancos e uniformizar o tom." },
    { id: "corte-luzes",     name: "Corte + Madeixas / Luzes",      price: 45, duration: 120, icon: "color",   desc: "Luzes com efeito natural e corte finalizado." },
    { id: "corte-platinado", name: "Corte + Platinado",             price: 50, duration: 150, icon: "color",   desc: "Platinado completo com corte." },
    { id: "pintura",         name: "Pintura",                       price: 17, duration: 60, icon: "color",    desc: "Pintura para cobrir cabelos brancos." },
    { id: "luzes",           name: "Luzes",                         price: 35, duration: 90, icon: "color",    desc: "Madeixas e luzes com efeito natural." },
    { id: "platinado",       name: "Platinado",                     price: 40, duration: 120, icon: "color",   desc: "Platinado técnico e uniforme." },
  ],

  /* -------------------------------------------------- */
  /*  EQUIPA — editar fotos e textos aqui                */
  /*  (photo vazio = avatar com as iniciais, elegante)   */
  /* -------------------------------------------------- */
  team: [
    {
      id: "rick",
      name: "Rick Gino",
      role: "Fundador & Barbeiro",
      specialty: "Cortes clássicos · Barba de navalha",
      description: "Fundador da casa, com anos de experiência em cortes clássicos e barba tradicional. Perfeccionista, transforma cada visita numa experiência.",
      photo: "",
    },
    {
      id: "renan",
      name: "Renan",
      role: "Barbeiro",
      specialty: "Fades & degradês",
      description: "Especialista em fades e cortes modernos. Preciso, rápido e sempre atento às tendências.",
      photo: "",
    },
    {
      id: "mateus",
      name: "Mateus",
      role: "Barbeiro",
      specialty: "Barba & visagismo",
      description: "Dedica-se à barba e ao visagismo, desenhando o contorno ideal para cada rosto.",
      photo: "",
    },
    {
      id: "mauro",
      name: "Mauro",
      role: "Barbeiro",
      specialty: "Coloração & acabamentos",
      description: "Responsável pela coloração, luzes e acabamentos que dão o toque final ao teu estilo.",
      photo: "",
    },
  ],

  /* -------------------------------------------------- */
  /*  GALERIA                                            */
  /* -------------------------------------------------- */
  gallery: [
    { src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop", alt: "Corte de cabelo a ser finalizado" },
    { src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1200&auto=format&fit=crop", alt: "Ferramentas de barbeiro" },
    { src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=1200&auto=format&fit=crop", alt: "Interior da barbearia" },
    { src: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?q=80&w=1200&auto=format&fit=crop", alt: "Barba feita à navalha" },
    { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop", alt: "Acabamento de corte" },
    { src: "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=1200&auto=format&fit=crop", alt: "Barba e contorno" },
    { src: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=1200&auto=format&fit=crop", alt: "Tesouras e detalhes" },
    { src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=1200&auto=format&fit=crop", alt: "Trabalho de barbeiro" },
  ],

  /* -------------------------------------------------- */
  /*  AVALIAÇÕES (Google + depoimentos)                  */
  /* -------------------------------------------------- */
  testimonials: [
    {
      name: "João M.",
      service: "Corte + Barba",
      text: "Melhor barbearia de Setúbal. Ambiente excelente, equipa profissional e o resultado é sempre impecável.",
    },
    {
      name: "Tiago S.",
      service: "Corte + Platinado",
      text: "Vim para o platinado e saí com outro look. Explicaram tudo, deram conselhos e o resultado superou o esperado.",
    },
    {
      name: "Ricardo F.",
      service: "Barba com toalha quente",
      text: "O momento de relaxamento mais premium que já tive numa barbearia. Toalha quente e navalha: uma experiência a repetir.",
    },
    {
      name: "André C.",
      service: "Corte",
      text: "Sempre consistente, sempre ao detalhe. Nota-se o cuidado com o acabamento. Recomendo a 100%.",
    },
  ],

  /* -------------------------------------------------- */
  /*  LINKS DO FOOTER E NAVEGAÇÃO                        */
  /* -------------------------------------------------- */
  nav: [
    { href: "#sobre",    label: "Sobre" },
    { href: "#servicos", label: "Serviços" },
    { href: "#equipa",   label: "Equipa" },
    { href: "#galeria",  label: "Galeria" },
    { href: "#avaliacoes", label: "Avaliações" },
    { href: "#contacto", label: "Contacto" },
  ],
};
