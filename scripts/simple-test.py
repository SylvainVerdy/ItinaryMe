import os
import asyncio
from browser_use import Agent
from langchain_ollama import ChatOllama
from dotenv import load_dotenv
import sys

# Charger les variables d'environnement
load_dotenv()

# Désactiver les vérifications d'API (essentiel)
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"

# Modèle à utiliser
MODEL_NAME = "mlaprise/gemma-3-4b-it-qat-q4_0-gguf"

async def run_test(user_query="meilleurs itinéraires touristiques en France"):
    """Fonction principale de test pour browser-use avec Ollama."""
    try:
        print(f"Test de browser-use avec le modèle: {MODEL_NAME}")
        
        # Configuration du modèle Ollama
        llm = ChatOllama(
            model=MODEL_NAME,
            temperature=0.1,  # Température plus basse pour réduire la complexité
            num_ctx=2048,     # Contexte plus petit pour réduire l'utilisation mémoire
            num_thread=4      # Limiter le nombre de threads
        )
        
        # Force l'attribut pour contourner la vérification
        llm._verified_api_keys = True
        
        # Création de l'agent avec une tâche simple
        print("Création de l'agent browser-use...")
        agent = Agent(
            task="""
            Va sur "https://www.google.com" cherche moi les meilleurs lieux pour faire une itinary de 10 jours en France.""",
            llm=llm
        )
        
        # Forcer la vérification à True avant l'exécution
        agent.llm._verified_api_keys = True
        
        # Exécution de l'agent
        print("Démarrage de l'agent...")
        await agent.run()
        
        print("Test terminé avec succès!")
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Utiliser la requête fournie en argument
        user_query = " ".join(sys.argv[1:])
    asyncio.run(run_test()) 