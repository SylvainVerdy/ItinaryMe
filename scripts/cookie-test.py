import os
import asyncio
import json
import sys
from browser_use import Agent
from langchain_ollama import ChatOllama
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Désactiver les vérifications d'API
os.environ["BROWSER_USE_SKIP_LLM_API_KEY_VERIFICATION"] = "true"
os.environ["BROWSER_USE_DISABLE_CONNECTION_CHECK"] = "true"

# Modèle à utiliser
MODEL_NAME = "mlaprise/gemma-3-4b-it-qat-q4_0-gguf"

async def extract_search_results(agent, query):
    """Extrait et analyse les résultats de recherche Google.
    
    Args:
        agent: L'agent browser-use
        query: La requête de recherche
    
    Returns:
        Un dictionnaire contenant les résultats analysés
    """
    try:
        # Récupérer le contenu de la page
        page_content = await agent.page.evaluate('document.body.innerText')
        
        # Demander au modèle d'analyser les résultats
        prompt = f"""
        Analyse les résultats de recherche Google suivants pour la requête "{query}".
        
        Contenu de la page:
        {page_content[:10000]}
        
        Extrais les informations suivantes:
        1. Résumé des principaux résultats (5 points maximum)
        2. Liens pertinents pour réserver des hôtels, restaurants ou activités (format JSON: [{"name": "nom", "url": "url"}])
        3. Informations pratiques utiles pour un voyageur
        
        Format ta réponse ainsi:
        
        ## RÉSUMÉ
        - Point 1
        - Point 2
        ...
        
        ## LIENS
        [{"name": "Nom du site", "url": "URL complète"}]
        
        ## INFORMATIONS PRATIQUES
        - Info 1
        - Info 2
        ...
        """
        
        # Analyser les résultats avec le modèle LLM
        result = await agent.llm.ainvoke(prompt)
        
        # Extraire les liens JSON
        import re
        links_match = re.search(r'## LIENS\s*(\[.*?\])', result, re.DOTALL)
        links = []
        
        if links_match:
            try:
                links_json = links_match.group(1)
                links = json.loads(links_json)
            except Exception as e:
                print(f"Erreur lors de l'extraction des liens JSON: {e}")
        
        return {
            "content": result,
            "links": links
        }
    except Exception as e:
        print(f"Erreur lors de l'analyse des résultats: {e}")
        import traceback
        traceback.print_exc()
        return {
            "content": f"Erreur d'analyse: {str(e)}",
            "links": []
        }

async def run_search(query):
    """Effectue une recherche web avec browser-use.
    
    Args:
        query: La requête de recherche Google
    
    Returns:
        Un dictionnaire contenant les résultats de la recherche
    """
    try:
        print(f"Recherche à effectuer: '{query}'")
        
        # Configuration du modèle
        llm = ChatOllama(
            model=MODEL_NAME,
            temperature=0.5,
            num_ctx=4096
        )
        
        # Force la vérification à True
        llm._verified_api_keys = True
        
        # Instructions détaillées incluant la gestion des cookies
        detailed_instructions = f"""
        Exécute les étapes suivantes:
        
        1. Ouvre un navigateur et va sur "https://www.google.com"
        
        2. Si une page de consentement de cookies apparaît:
           - Cherche le bouton "Tout accepter" ou "J'accepte" (souvent bleu) et clique dessus
           - Si tu ne le trouves pas, cherche et clique sur le bouton avec le texte "Accepter"
           - Si tu vois un bouton numéro 4 étiqueté "Tout accepter", clique dessus
            - Si tu vois un bouton étiqueté "Non merci", clique dessus

        3. Une fois sur Google, recherche exactement cette requête: "{query}"
        
        4. Attends que les résultats de recherche soient chargés
        """
        
        # Création de l'agent avec instructions détaillées
        print("Création de l'agent browser-use...")
        agent = Agent(
            task=detailed_instructions,
            llm=llm,
        )
        
        # Exécution de l'agent
        print("Démarrage de l'agent...")
        await agent.run()
        
        # Analyser les résultats de recherche
        print("Analyse des résultats de recherche...")
        results = await extract_search_results(agent, query)
        
        print("Recherche terminée avec succès!")
        return {
            "success": True,
            "content": results["content"],
            "links": results["links"]
        }
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "content": None,
            "links": []
        }

if __name__ == "__main__":
    # Récupérer la requête de l'utilisateur depuis les arguments de ligne de commande
    user_query = "meilleurs itinéraires touristiques en France"  # Requête par défaut
    
    if len(sys.argv) > 1:
        # Utiliser la requête fournie en argument
        user_query = " ".join(sys.argv[1:])
    
    # Exécuter la recherche
    result = asyncio.run(run_search(user_query))
    
    # Afficher les résultats
    if result["success"]:
        print("\n=== RÉSULTATS DE RECHERCHE ===")
        print(result["content"])
        
        # Créer un répertoire pour sauvegarder les résultats
        output_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder les résultats au format JSON
        result_file = os.path.join(output_dir, f"search_results_{int(asyncio.get_event_loop().time())}.json")
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump({
                "query": user_query,
                "content": result["content"],
                "links": result["links"]
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\nRésultats sauvegardés dans {result_file}")
    else:
        print(f"La recherche a échoué: {result['error']}") 