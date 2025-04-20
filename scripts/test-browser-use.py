from browser_use import Agent
import asyncio
import os
import sys
import subprocess
from dotenv import load_dotenv

# Configuration de l'environnement
load_dotenv()

# Désactiver toutes les vérifications et validations
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"
os.environ["BROWSER_USE_DISABLE_CONNECTION_CHECK"] = "true"
os.environ["BROWSER_USE_DISABLE_API_VERIFICATION"] = "true"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Nom du modèle vision à utiliser
VISION_MODEL = "bsahane/Qwen2.5-VL-7B-Instruct:Q4_K_M_benxh"

# Fonction pour vérifier si Ollama est en cours d'exécution
def check_ollama():
    try:
        import requests
        response = requests.get("http://localhost:11434/api/version")
        if response.status_code == 200:
            return True, response.json().get('version', 'inconnue')
        return False, None
    except Exception:
        return False, None

# Fonction pour vérifier si le modèle est disponible
def check_model_available(model_name):
    try:
        import subprocess
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        return model_name in result.stdout
    except Exception:
        return False

# Fonction pour installer une dépendance si nécessaire
def ensure_package(package_name):
    try:
        __import__(package_name.replace('-', '_'))
        print(f"✅ {package_name} est déjà installé")
        return True
    except ImportError:
        print(f"⚠️ Installation de {package_name}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'installation de {package_name}: {e}")
        return False

# Classe modifiée de ChatOllama avec vérification d'API forcée
class VerifiedChatOllama:
    def __init__(self, model_name):
        from langchain_ollama import ChatOllama
        self.ollama = ChatOllama(model=model_name, temperature=0.1)
        # Forcer la vérification à True
        self.ollama._verified_api_keys = True
    
    def __getattr__(self, name):
        return getattr(self.ollama, name)

# Patch pour la classe Agent de browser-use
def patch_agent():
    """Patch la classe Agent pour désactiver la vérification des API."""
    original_run = Agent.run
    
    async def patched_run(self, *args, **kwargs):
        # Forcer l'attribut de vérification sans avoir à effectuer le test
        self.llm._verified_api_keys = True
        
        # Contourner la vérification de connexion
        print("📌 Contournement de la vérification de connexion")
        
        # Appeler la méthode originale
        return await original_run(self, *args, **kwargs)
    
    # Appliquer le patch
    Agent.run = patched_run
    print("✅ Patch appliqué: vérification d'API désactivée")
    
    return Agent

# Patcher l'agent avant de l'utiliser
patched_Agent = patch_agent()

async def main():
    print("🔍 Vérification des dépendances...")
    # Assurer que les dépendances sont installées
    ensure_package("langchain-ollama")
    
    # Vérifier qu'Ollama est en cours d'exécution
    ollama_running, version = check_ollama()
    if not ollama_running:
        print("❌ Ollama n'est pas en cours d'exécution. Veuillez démarrer Ollama avec 'ollama serve'")
        return
    
    print(f"✅ Ollama est en cours d'exécution (version {version})")
    
    # Vérifier que le modèle vision est disponible
    if not check_model_available(VISION_MODEL):
        print(f"⚠️ Le modèle {VISION_MODEL} n'est pas trouvé dans la liste des modèles Ollama.")
        print(f"   Cependant, nous allons continuer car le nom du modèle pourrait être différent dans la sortie de 'ollama list'.")
    else:
        print(f"✅ Le modèle {VISION_MODEL} est disponible")
    
    try:
        # Importer langchain_ollama ici pour éviter les erreurs d'importation
        from langchain_ollama import ChatOllama
        
        # Utiliser la configuration la plus simple possible
        print("\n🤖 Initialisation de l'agent browser-use...")
        
        # Créer notre adaptateur avec vérification d'API forcée
        llm_adapter = VerifiedChatOllama(VISION_MODEL)
        
        # Créer l'agent avec instructions très précises 
        agent = patched_Agent(
            task="""
            1. Va sur "https://www.google.com" directement en tapant cette URL dans la barre d'adresse.
            2. Une fois sur Google, recherche exactement cette phrase: "itinary me travel".
            3. Fais défiler la page pour voir les résultats.
            """,
            llm=llm_adapter.ollama
        )
        
        # Exécuter l'agent
        print("▶️ Démarrage de l'agent...")
        await agent.run()
        print("✅ Test réussi!")
        
    except Exception as e:
        print(f"❌ Erreur durant le test: {e}")
        print("\nDétails complets de l'erreur:")
        import traceback
        traceback.print_exc()
        
        print("\n🔍 Conseils de dépannage:")
        print(f"1. Vérifiez que browser-use est à jour: pip install -U browser-use")
        print(f"2. Vérifiez que le modèle {VISION_MODEL} est bien installé: ollama list")
        print(f"3. Essayez de redémarrer le serveur Ollama: ollama serve")

if __name__ == "__main__":
    asyncio.run(main())
