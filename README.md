# Agent d'Automatisation Web avec IA Locale

Cette application permet de créer un agent d'automatisation web qui utilise un modèle LLM local via Ollama (comme qwen2.5) pour analyser et interagir avec des pages web.

## Nouvelles fonctionnalités: Automatisation de navigateur et recherche web

ItinaryMe intègre désormais deux technologies puissantes pour améliorer l'expérience utilisateur:

### 1. Browser-use

[Browser-use](https://github.com/browser-use/browser-use) permet à l'IA d'interagir directement avec votre navigateur pour:
- Rechercher et comparer automatiquement des hôtels, vols et activités
- Réserver des billets ou des hébergements sur des sites de voyage
- Vérifier les disponibilités et les prix en temps réel
- Créer des itinéraires détaillés basés sur des informations à jour

### 2. SerpAPI pour la recherche web

L'application intègre également [SerpAPI](https://serpapi.com/) pour effectuer des recherches web structurées:
- Obtenir des informations précises sur les destinations de voyage
- Rechercher des hôtels, activités et vols
- Accéder aux données de recherche Google de manière programmatique
- Fournir des informations à jour sans nécessiter de navigation complète

### Installation des dépendances

Pour utiliser les fonctionnalités d'automatisation et de recherche web, suivez ces étapes:

1. Assurez-vous que Python 3.8-3.12 est installé sur votre système
   > **Important**: La fonctionnalité de mémoire nécessite PyTorch qui n'est pas compatible avec Python 3.13+
2. Assurez-vous qu'Ollama est installé et fonctionne correctement avec au moins un modèle (comme qwen2.5)
3. Exécutez le script d'installation:

```bash
node scripts/setup-browser-use.js
```

Ce script va:
- Installer browser-use et ses dépendances
- Installer langchain_ollama pour intégrer Ollama
- Installer langchain_serp pour la recherche web
- Configurer Playwright (moteur de navigation)
- Installer Chromium (navigateur)
- Configurer les variables d'environnement pour Ollama et SerpAPI

### Résolution des problèmes d'installation

Si vous rencontrez des erreurs de type "Module not found" lors de l'exécution des scripts, essayez cette installation alternative:

#### Option 1: Installation Python directe

```bash
# Utilisez directement l'interpréteur Python pour installer les modules
python -m pip install "browser-use[memory]" langchain_ollama langchain_serp playwright
playwright install chromium
```

#### Option 2: Script d'installation Python

Nous avons créé un script Python qui installe tout dans l'environnement Python actif:

```bash
# Exécutez le script d'installation Python
python scripts/install-manually.py
```

Ce script:
- Détecte votre environnement Python actif
- Met à jour pip
- Installe toutes les dépendances nécessaires
- Vérifie que les modules sont bien installés
- Crée un script de test pour vérifier le bon fonctionnement

#### Problèmes courants

- **Plusieurs versions de Python**: Assurez-vous d'utiliser la même version de Python pour installer et exécuter
- **Environnements virtuels**: Si vous utilisez un environnement virtuel, activez-le avant l'installation
- **Permissions**: Sur certains systèmes, vous pourriez avoir besoin d'utiliser `sudo` pour l'installation
- **Compatibilité Python**: La fonctionnalité de mémoire utilise PyTorch qui n'est pas compatible avec Python 3.13+

### Utilisation

Une fois installé, vous pouvez demander à l'assistant IA d'effectuer des actions dans le navigateur ou des recherches web:

- "Recherche des hôtels à Paris pour mon voyage"
- "Compare les prix des vols pour Rome aux dates de mon voyage"
- "Trouve les meilleures activités à faire à Barcelone"
- "Vérifie la disponibilité de l'hôtel Mercure à Lyon pour mes dates"

L'assistant utilisera une combinaison de recherche web via SerpAPI et de navigation automatisée via browser-use pour fournir les informations demandées.

## Configuration d'Ollama

1. Installez Ollama depuis [https://ollama.ai/](https://ollama.ai/)
2. Téléchargez un modèle comme qwen2.5:
   ```bash
   ollama pull qwen2.5
   ```
3. Vérifiez que le serveur Ollama est en cours d'exécution:
   ```bash
   ollama serve
   ```

## Fonctionnalités existantes

- Planification de voyages avec IA
- Génération d'itinéraires personnalisés
- Suggestions d'activités et de lieux à visiter
- Organisation de vos documents de voyage
- Interface de chat avec assistant IA
- Historique des conversations

## Fonctionnalités

- 🌐 Navigation web automatisée via Playwright
- 🧠 Analyse de contenu avec modèles LLM locaux via Ollama
- 🔍 Recherche web avec SerpAPI pour des informations à jour
- 📷 Capture d'écran et extraction de contenu
- 🤖 Exécution de tâches complexes guidées par l'IA
- 🔄 Interface utilisateur réactive et intuitive

## Prérequis

- Python 3.8-3.12 (⚠️ La fonctionnalité de mémoire nécessite PyTorch qui n'est pas compatible avec Python 3.13+)
- Node.js 18+
- npm ou yarn
- Ollama installé localement (pour les fonctions d'IA)

## Installation

1. Clonez ce dépôt
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env.local` avec les variables suivantes :
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5
   GOOGLE_GENAI_API_KEY=your-google-api-key
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
