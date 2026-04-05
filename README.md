# ItinaryMe

> Redéfinir l'expérience du voyage grâce à l'intelligence artificielle.

Une application web propulsée par un agent IA agentic qui planifie, recherche et organise vos voyages de bout en bout — vols réels, hôtels, restaurants, itinéraire jour par jour et réservation intégrée.

---

## ✨ Fonctionnalités

- **Agent IA agentic** — Basé sur Qwen3.5 via Ollama, avec tool calling : recherche web, restaurants, vols, hôtels
- **Recherche en temps réel** — SerpAPI (Google Search, Google Maps, Google Flights, Google Hotels)
- **Vols & Hôtels** — Recherche via SerpAPI + réservation via Duffel API
- **Liens de réservation directs** — Options de booking via `booking_token` Google Flights
- **Panier de réservation** — Ajout de vols/hôtels au panier, paiement Stripe
- **Itinéraire jour par jour** — Gestion des activités par destination
- **Historique de conversations** — Sauvegarde Firebase Firestore
- **Sources web** — Chaque réponse de l'agent affiche les sources utilisées
- **Authentification** — Firebase Auth

---

## 🛠 Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| IA / LLM | Ollama local — Qwen3.5:9b (tool calling) |
| Recherche web | SerpAPI — Google Search, Maps, Flights, Hotels |
| Vols & Hôtels | Duffel API |
| Paiement | Stripe |
| Base de données | Firebase Firestore |
| Auth | Firebase Authentication |

---

## 🚀 Installation

### Prérequis

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.ai/) installé localement
- Compte [Firebase](https://firebase.google.com/)
- Compte [SerpAPI](https://serpapi.com/)
- Compte [Duffel](https://duffel.com/) (sandbox gratuit)
- Compte [Stripe](https://stripe.com/) (test mode)

### 1. Cloner et installer

```bash
git clone https://github.com/SylvainVerdy/ItinaryMe.git
cd ItinaryMe
npm install
```

### 2. Variables d'environnement

Copier `.env.example` en `.env.local` et remplir les valeurs :

```bash
cp .env.example .env.local
```

```env
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:9b

# SerpAPI (serpapi.com)
SERPAPI_KEY=your-serpapi-key

# Duffel API
DUFFEL_ACCESS_TOKEN=duffel_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_BASE_URL=http://localhost:9000
```

### 3. Ollama — Télécharger le modèle

```bash
ollama pull qwen3.5:9b
ollama serve
```

> Le modèle 27b fonctionne également pour de meilleures performances.

### 4. Firebase

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activer **Firestore** et **Authentication** (Email/Password)
3. Ajouter la config Firebase dans `src/lib/firebase.ts`
4. Déployer les règles Firestore :

```bash
firebase deploy --only firestore:rules
```

### 5. Lancer l'application

```bash
npm run dev
```

L'application est disponible sur `http://localhost:9000`

---

## 🗂 Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # Agent IA agentic (Ollama + tools)
│   │   ├── checkout/      # Stripe checkout session
│   │   ├── webhook/       # Stripe webhook
│   │   └── search/        # Routes de recherche vols/hôtels
│   ├── dashboard/         # Dashboard principal
│   ├── travel/[id]/       # Page voyage (itinéraire, chat, notes)
│   └── payment/           # Pages succès/annulation paiement
├── components/
│   ├── chat/              # TripPlannerChat, FlightResultCard, HotelResultCard
│   ├── itinerary/         # ItineraryView, AddActivityModal
│   └── cart/              # CartDrawer, CartItemRow
├── context/
│   └── CartContext.tsx    # Panier global
├── lib/
│   ├── web-tools.ts       # SerpAPI : webSearch, searchRestaurants, searchFlights, searchHotels
│   ├── city-data.ts       # Base de données IATA des villes
│   ├── duffel.ts          # Client Duffel
│   └── stripe.ts          # Client Stripe
├── services/
│   ├── duffel-flights.ts  # Recherche & réservation vols
│   ├── duffel-stays.ts    # Recherche & réservation hôtels
│   └── activityService.ts # CRUD activités Firestore
└── types/                 # Types TypeScript partagés
```

---

## 🤖 Agent IA — Tools disponibles

| Tool | Description | Source |
|---|---|---|
| `web_search` | Recherche web générale | SerpAPI Google Search |
| `search_restaurants` | Restaurants & bars par ville | SerpAPI Google Maps |
| `search_flights` | Vols entre deux villes | SerpAPI Google Flights |
| `search_hotels` | Hôtels dans une ville | SerpAPI Google Hotels |
| `get_booking_options` | Options de réservation pour un vol | SerpAPI booking_token |
| `fetch_page` | Lecture d'une page web | Jina Reader |

---

## 🔒 Sécurité

- Les variables d'environnement ne sont **jamais** committées (`.env.local` dans `.gitignore`)
- Les règles Firestore restreignent l'accès aux données par `userId`
- Les clés API sont uniquement côté serveur (routes Next.js)
