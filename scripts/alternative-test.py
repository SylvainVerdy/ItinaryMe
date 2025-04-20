import os
import asyncio
from browser_use import Agent
from langchain_ollama import ChatOllama
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Désactiver les vérifications d'API
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["BROWSER_USE_DISABLE_CONNECTION_CHECK"] = "true"

# Utiliser le modèle qwen standard sans vision
MODEL_NAME = "qwen2.5"

async def run_test():
    """Test avec modèle standard et options pour éviter l'erreur GGML."""
    try:
        print(f"Test de browser-use avec le modèle: {MODEL_NAME}")
        
        # Configuration du modèle Ollama avec des options pour la stabilité
        llm = ChatOllama(
            model=MODEL_NAME,
            temperature=0.1,  # Température plus basse pour réduire la complexité
            num_ctx=2048,     # Contexte plus petit pour réduire l'utilisation mémoire
            num_thread=4      # Limiter le nombre de threads
        )
        
        # Force la vérification à True
        llm._verified_api_keys = True
        
        # Test simple du LLM avant de créer l'agent
        print("Test du modèle avant création de l'agent...")
        try:
            response = await llm.ainvoke("Say hello in one word")
            print(f"Réponse du modèle: {response.content}")
        except Exception as llm_error:
            print(f"Erreur de test du modèle: {llm_error}")
            return
            
        # Création de l'agent avec une tâche très simple
        print("Création de l'agent browser-use...")
        agent = Agent(
            task="Ouvre un navigateur et va sur Google",
            llm=llm
        )
        
        # Vérification forcée une seconde fois
        agent.llm._verified_api_keys = True
        
        # Exécution de l'agent
        print("Démarrage de l'agent...")
        await agent.run()
        
        print("Test terminé avec succès!")
    except Exception as e:
        print(f"Erreur générale: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test()) 