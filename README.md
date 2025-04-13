# Agent d'Automatisation Web avec IA Locale

Cette application permet de créer un agent d'automatisation web qui utilise un modèle LLM local via Ollama (comme DeepSeek) pour analyser et interagir avec des pages web.

## Fonctionnalités

- 🌐 Navigation web automatisée via Puppeteer
- 🧠 Analyse de contenu avec modèles LLM locaux via Ollama
- 📷 Capture d'écran et extraction de contenu
- 🤖 Exécution de tâches complexes guidées par l'IA
- 🔄 Interface utilisateur réactive et intuitive

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
2. Accédez à l'interface d'automatisation : [http://localhost:9000/automation](http://localhost:9000/automation)

## API d'Automatisation Web

L'application expose une API REST à `/api/browser-agent` avec les actions suivantes :

- `init` : Initialise le navigateur
- `navigate` : Navigue vers une URL
- `extract` : Extrait le contenu textuel de la page
- `analyze` : Analyse la page avec le LLM
- `screenshot` : Prend une capture d'écran
- `executeTask` : Exécute une tâche complexe
- `click` : Clique sur un élément
- `fill` : Remplit un champ de formulaire
- `close` : Ferme le navigateur

## Structure du Projet

- `src/ai/agents/` : Modules d'IA et d'automatisation
- `src/components/WebAutomationInterface.tsx` : Interface utilisateur
- `src/hooks/useBrowserAgent.ts` : Hook React pour interagir avec l'API
- `src/app/api/browser-agent/route.ts` : API REST pour contrôler l'agent
