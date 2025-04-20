import os
import asyncio
import inspect
import tempfile
import sys
from dotenv import load_dotenv

# Configuration de l'environnement
load_dotenv()

# Désactiver toutes les vérifications possibles
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"
os.environ["BROWSER_USE_DISABLE_CONNECTION_CHECK"] = "true"
os.environ["BROWSER_USE_DISABLE_API_VERIFICATION"] = "true"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Nom du modèle vision à utiliser
VISION_MODEL = "bsahane/Qwen2.5-VL-7B-Instruct:Q4_K_M_benxh"

# Monkey patch pour la classe Agent
def patch_agent():
    """Patch la classe Agent pour désactiver la vérification des API."""
    from browser_use import Agent
    
    # Sauvegarde de la méthode originale run
    original_run = Agent.run
    
    # Nouvelle méthode run qui contourne les vérifications
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

# Appliquer le patch avant d'importer d'autres modules
patched_Agent = patch_agent()

# Importer après avoir appliqué le patch
from langchain_ollama import ChatOllama

async def main():
    try:
        print(f"🤖 Création de l'agent avec le modèle {VISION_MODEL}...")
        
        # Créer l'agent avec le modèle vision et les instructions explicites
        agent = patched_Agent(
            task="""
            1. Va sur "https://www.google.com" directement en tapant cette URL dans la barre d'adresse.
            2. Une fois sur Google, recherche exactement cette phrase: "itinary me travel".
            3. Fais défiler la page pour voir les résultats.
            """,
            llm=ChatOllama(
                model=VISION_MODEL,
                temperature=0.1
            )
        )
        
        print("▶️ Démarrage de l'agent...")
        await agent.run()
        print("✅ Test réussi!")
        
    except Exception as e:
        print(f"❌ Erreur durant le test: {e}")
        print("\nDétails complets de l'erreur:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 