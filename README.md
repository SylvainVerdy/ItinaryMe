# Redéfinir l’expérience du voyage grâce à l’intelligence artificielle.
Une application web intuitive, propulsée par un agent IA, qui planifie, réserve et organise vos voyages de bout en bout.

## Prérequis

1. [Node.js](https://nodejs.org/en/) (v18 ou supérieur)
2. [Ollama](https://ollama.ai/) installé localement
3. Au moins un modèle LLM installé via Ollama (comme DeepSeek)

## Installation

1. Clonez ce dépôt
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env.local` avec les variables suivantes :
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=deepseek-coder
   GOOGLE_GENAI_API_KEY=your-google-api-key
   ```

## Configuration d'Ollama

1. Installez Ollama depuis [https://ollama.ai/](https://ollama.ai/)
2. Téléchargez le modèle DeepSeek (ou autre) :
   ```bash
   ollama pull deepseek-coder
   ```
3. Vérifiez que le serveur Ollama est en cours d'exécution :
   ```bash
   ollama serve
   ```

## Utilisation

1. Démarrez l'application :
   ```bash
   npm run dev
   ```

## Structure du Projet

- `src/ai/agents/` : Modules d'IA et d'automatisation
- `src/components/WebAutomationInterface.tsx` : Interface utilisateur
- `src/hooks/useBrowserAgent.ts` : Hook React pour interagir avec l'API
- `src/app/api/browser-agent/route.ts` : API REST pour contrôler l'agent
