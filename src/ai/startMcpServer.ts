import startTravelSearchServer from './services/TravelSearchServer';
import startTravelPriceServer from './services/TravelPriceServer';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Vérifier la présence de la clé API SERP
if (!process.env.SERP_API_KEY) {
  console.warn("⚠️  SERP_API_KEY non définie dans les variables d'environnement. Les recherches échoueront.");
}

// Vérifier la configuration d'Ollama
if (!process.env.OLLAMA_BASE_URL) {
  console.log("📝 OLLAMA_BASE_URL non définie, utilisation de l'URL par défaut: http://localhost:11434");
}

// Démarrer les serveurs
const SEARCH_PORT = parseInt(process.env.MCP_SEARCH_SERVER_PORT || '3300', 10);
const PRICE_PORT = parseInt(process.env.MCP_PRICE_SERVER_PORT || '3301', 10);

try {
  const searchServer = startTravelSearchServer(SEARCH_PORT);
  console.log(`✅ Serveur de recherche MCP démarré sur le port ${SEARCH_PORT}`);
  
  const priceServer = startTravelPriceServer(PRICE_PORT);
  console.log(`✅ Serveur de prix MCP démarré sur le port ${PRICE_PORT}`);
  
  console.log("ℹ️  Serveurs MCP prêts à recevoir des requêtes");
  
  // Gestion de l'arrêt propre
  const shutdown = () => {
    console.log("\nArrêt des serveurs MCP...");
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error("❌ Erreur lors du démarrage des serveurs MCP:", error);
  process.exit(1);
} 