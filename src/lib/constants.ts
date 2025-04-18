
// This file contains constants used throughout the application

export const WEBHOOK_URLS = {
  SPORTS_RESULTS: "https://your-n8n-webhook-url.com/webhook/sports-results",
  // Add more webhook URLs here
};

// The different types of assistants available
export const ASSISTANT_TYPES = {
  SPORTS_RESULTS: "assistente_de_resultados_esportivos",
  DIGIRIOH: "digirioh",
  BOOKING_AGENT: "agente_do_booking",
  AIRBNB_AGENT: "agente_de_airbnb",
};

// Default assistant descriptions
export const ASSISTANT_DESCRIPTIONS = {
  [ASSISTANT_TYPES.SPORTS_RESULTS]: "Obtenha os resultados mais atualizados de partidas esportivas em tempo real.",
  [ASSISTANT_TYPES.DIGIRIOH]: "Assistente digital para otimização de processos e tomada de decisão.",
  [ASSISTANT_TYPES.BOOKING_AGENT]: "Otimize suas reservas e maximize sua ocupação com nosso assistente especializado.",
  [ASSISTANT_TYPES.AIRBNB_AGENT]: "Maximize o potencial de seus imóveis no Airbnb com recomendações personalizadas.",
};
