const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour exécuter une commande et afficher la sortie
function runCommand(command) {
  console.log(`\n> ${command}`);
  try {
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'exécution de la commande: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Fonction pour poser une question à l'utilisateur
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Fonction pour vérifier la version de Python
async function checkPythonVersion() {
  return new Promise((resolve, reject) => {
    exec('python --version', (error, stdout, stderr) => {
      if (error) {
        console.log('\x1b[33m%s\x1b[0m', '⚠️ Python n\'a pas été détecté. Veuillez installer Python 3.8-3.12 pour utiliser les fonctionnalités de mémoire.');
        resolve(false);
        return;
      }
      
      const versionOutput = stdout || stderr;
      const versionMatch = versionOutput.match(/Python (\d+\.\d+\.\d+)/);
      
      if (versionMatch && versionMatch[1]) {
        const version = versionMatch[1];
        const majorMinor = version.split('.').slice(0, 2).join('.');
        
        if (parseFloat(majorMinor) >= 3.13) {
          console.log('\x1b[33m%s\x1b[0m', `⚠️ Vous utilisez Python ${version}, mais PyTorch n'est pas compatible avec Python 3.13+.`);
          console.log('\x1b[33m%s\x1b[0m', 'Pour utiliser les fonctionnalités de mémoire, veuillez installer Python 3.8-3.12.');
          
          rl.question('Voulez-vous continuer l\'installation sans les fonctionnalités de mémoire? (o/n): ', (answer) => {
            if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
              resolve(true);
            } else {
              console.log('Installation interrompue. Veuillez installer une version compatible de Python.');
              resolve(false);
            }
          });
          return;
        } else if (parseFloat(majorMinor) < 3.8) {
          console.log('\x1b[33m%s\x1b[0m', `⚠️ Vous utilisez Python ${version}, mais PyTorch fonctionne mieux avec Python 3.8-3.12.`);
          console.log('\x1b[33m%s\x1b[0m', 'Certaines fonctionnalités pourraient ne pas fonctionner correctement.');
          resolve(true);
          return;
        }
        
        console.log('\x1b[32m%s\x1b[0m', `✅ Python ${version} détecté, compatible avec PyTorch.`);
        resolve(true);
      } else {
        console.log('\x1b[33m%s\x1b[0m', '⚠️ Impossible de déterminer la version de Python. Veuillez vous assurer d\'utiliser Python 3.8-3.12.');
        resolve(true);
      }
    });
  });
}

// Fonction principale
async function setup() {
  console.log('\n==== Installation de browser-use et ses dépendances ====\n');
  
  // Vérifier la version de Python
  const pythonVersionOk = await checkPythonVersion();
  if (!pythonVersionOk) {
    rl.close();
    return;
  }
  
  // Vérifier si pip est disponible
  try {
    const pipVersion = execSync('pip --version').toString();
    console.log(`pip détecté: ${pipVersion.trim()}`);
  } catch (error) {
    console.error('pip n\'est pas disponible. Veuillez l\'installer.');
    process.exit(1);
  }

  // Créer les répertoires nécessaires
  const tempDir = path.join(process.cwd(), 'temp');
  const scriptsDir = path.join(process.cwd(), 'scripts');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Répertoire créé: ${tempDir}`);
  }

  // Installer uv (gestionnaire de paquets Python rapide)
  console.log('\nInstallation de uv...');
  runCommand('pip install uv');
  
  // Créer un environnement virtuel Python 3.11
  console.log('\nCréation de l\'environnement virtuel...');
  runCommand('uv venv --python 3.11');
  
  // Activer l'environnement virtuel sur Windows
  console.log('\nActivation de l\'environnement virtuel...');
  runCommand('.venv\\Scripts\\activate');
  
  // Installer browser-use
  console.log('\nInstallation de browser-use...');
  runCommand('uv pip install browser-use');
  
  // Installer langchain_ollama au lieu de langchain_openai
  console.log('\nInstallation de langchain_ollama...');
  runCommand('pip3 install langchain_ollama || pip install langchain_ollama');
  
  // Installer langchain_serp pour la recherche internet
  console.log('\nInstallation de langchain_serp...');
  runCommand('pip3 install langchain_serp || pip install langchain_serp');
  
  // Installer playwright
  console.log('\nInstallation de Playwright...');
  runCommand('uv run playwright install');
  
  // Vérifier que browser_use est bien installé
  console.log('\nVérification de l\'installation...');
  try {
    execSync('python -c "import browser_use; print(\'Module browser_use trouvé!\')"', { stdio: 'inherit' });
  } catch (error) {
    console.error('\nLe module browser_use n\'a pas été trouvé. Tentative d\'installation alternative...');
    runCommand('python -m pip install "browser-use[memory]"');
    
    try {
      execSync('python -c "import browser_use; print(\'Module browser_use trouvé!\')"', { stdio: 'inherit' });
      console.log('\nInstallation réussie!');
    } catch (secondError) {
      console.error('\nÉchec de l\'installation. Vérifiez votre environnement Python.');
      console.log('\nSuggestions:');
      console.log('1. Assurez-vous que pip est à jour: python -m pip install --upgrade pip');
      console.log('2. Essayez d\'installer manuellement: python -m pip install "browser-use[memory]"');
      console.log('3. Vérifiez que vous n\'utilisez pas un environnement virtuel différent');
      console.log('4. Si vous avez plusieurs versions de Python, utilisez la version correcte');
    }
  }
  
  // Vérifier si PyTorch est installé correctement pour les fonctionnalités de mémoire
  try {
    execSync('python -c "import torch; print(\'PyTorch est installé!\')"', { stdio: 'inherit' });
  } catch (error) {
    console.log('\n⚠️ PyTorch n\'est pas installé. Les fonctionnalités de mémoire ne seront pas disponibles.');
    const installTorch = await askQuestion('Souhaitez-vous installer PyTorch maintenant? (o/n): ');
    if (installTorch.toLowerCase() === 'o') {
      console.log('\nInstallation de PyTorch...');
      runCommand('pip3 install torch || pip install torch');
    } else {
      console.log('\nVous pouvez installer PyTorch plus tard avec: pip install torch');
    }
  }
  
  // Configurer le fichier .env pour les clés API
  const envPath = path.join(process.cwd(), '.env');
  const envExample = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envPath);
      console.log('\nFichier .env créé à partir de .env.example');
    } else {
      fs.writeFileSync(envPath, `OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5
SERPAPI_API_KEY=46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8
`);
      console.log('\nFichier .env créé avec les variables nécessaires pour Ollama et SerpAPI');
    }
  }
  
  // Vérifier que les variables Ollama sont configurées
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('OLLAMA_BASE_URL=')) {
    envContent += '\nOLLAMA_BASE_URL=http://localhost:11434';
    fs.writeFileSync(envPath, envContent);
    console.log('URL de base Ollama ajoutée au fichier .env');
  }
  
  if (!envContent.includes('OLLAMA_MODEL=')) {
    envContent += '\nOLLAMA_MODEL=qwen2.5';
    fs.writeFileSync(envPath, envContent);
    console.log('Modèle Ollama par défaut ajouté au fichier .env');
  }
  
  // Ajouter la clé SerpAPI si elle n'existe pas
  if (!envContent.includes('SERPAPI_API_KEY=')) {
    envContent += '\nSERPAPI_API_KEY=46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8';
    fs.writeFileSync(envPath, envContent);
    console.log('Clé API SerpAPI ajoutée au fichier .env');
  }
  
  // Tester l'installation
  console.log('\nTest de l\'installation de browser-use...');
  
  // Créer un script de test
  const testScriptPath = path.join(scriptsDir, 'test-browser-use.py');
  fs.writeFileSync(testScriptPath, `
from browser_use import Agent
from langchain_ollama import ChatOllama
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        agent = Agent(
            task="Ouvrir google.com et rechercher 'ItinaryMe'",
            llm=ChatOllama(model="qwen2.5"),
            max_steps=3
        )
        await agent.run()
        print("Test réussi!")
    except Exception as e:
        print(f"Erreur durant le test: {e}")

if __name__ == "__main__":
    asyncio.run(main())
`);
  
  const runTest = await askQuestion('\nSouhaitez-vous exécuter un test de browser-use maintenant? (o/n): ');
  
  if (runTest.toLowerCase() === 'o') {
    console.log('\nExécution du test...');
    runCommand(`python ${testScriptPath}`);
  }
  
  // Ajouter une indication sur la commande à exécuter en cas d'erreur avec l'environnement Python
  console.log('\n==== Installation terminée ====');
  console.log('Vous pouvez maintenant utiliser browser-use dans votre application ItinaryMe!');
  console.log('Documentation: https://github.com/browser-use/browser-use');
  console.log('\nRemarque importante:');
  console.log('La fonctionnalité de mémoire nécessite PyTorch qui n\'est compatible qu\'avec Python < 3.13');
  console.log('Pour une compatibilité optimale, utilisez Python 3.8-3.12');
  console.log('\nSi vous rencontrez des erreurs de type "Module not found", essayez d\'exécuter:');
  console.log('python -m pip install "browser-use[memory]" langchain_ollama langchain_serp playwright');
  console.log('playwright install chromium');
}

// Exécuter la fonction principale
setup().catch(error => {
  console.error('Une erreur est survenue:', error);
  process.exit(1);
}); 