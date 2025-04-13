/**
 * Script pour configurer les émulateurs Firebase locaux
 * 
 * Pour l'utiliser :
 * 1. Installez les outils Firebase : npm install -g firebase-tools
 * 2. Exécutez ce script : node firebase-emulators.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Configuration des émulateurs Firebase locaux...');

// Créer un fichier firebase.json s'il n'existe pas
const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');
if (!fs.existsSync(firebaseConfigPath)) {
  console.log('Création du fichier firebase.json...');
  const firebaseConfig = {
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    },
    "emulators": {
      "auth": {
        "port": 9099
      },
      "firestore": {
        "port": 8080
      },
      "ui": {
        "enabled": true,
        "port": 4000
      }
    }
  };
  
  fs.writeFileSync(firebaseConfigPath, JSON.stringify(firebaseConfig, null, 2));
  console.log('✅ firebase.json créé');
}

// Créer un fichier firestore.rules s'il n'existe pas
const rulesPath = path.join(process.cwd(), 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.log('Création du fichier firestore.rules...');
  const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Pour le développement local, autoriser toutes les opérations
      allow read, write: if true;
    }
  }
}`;
  
  fs.writeFileSync(rulesPath, rules);
  console.log('✅ firestore.rules créé');
}

// Créer un fichier firestore.indexes.json s'il n'existe pas
const indexesPath = path.join(process.cwd(), 'firestore.indexes.json');
if (!fs.existsSync(indexesPath)) {
  console.log('Création du fichier firestore.indexes.json...');
  const indexes = {
    "indexes": [],
    "fieldOverrides": []
  };
  
  fs.writeFileSync(indexesPath, JSON.stringify(indexes, null, 2));
  console.log('✅ firestore.indexes.json créé');
}

// Démarrer les émulateurs
console.log('Démarrage des émulateurs Firebase...');
const emulators = spawn('firebase', ['emulators:start'], { shell: true });

emulators.stdout.on('data', (data) => {
  console.log(`${data}`);
});

emulators.stderr.on('data', (data) => {
  console.error(`${data}`);
});

emulators.on('close', (code) => {
  console.log(`Les émulateurs Firebase se sont arrêtés avec le code ${code}`);
});

// Afficher les instructions
console.log(`
📋 Instructions d'utilisation :
1. Les émulateurs Firebase fonctionnent maintenant en arrière-plan
2. Interface d'administration disponible sur http://localhost:4000
3. Émulateur Firestore sur le port 8080
4. Émulateur Auth sur le port 9099
5. Pour arrêter les émulateurs, appuyez sur Ctrl+C
`); 