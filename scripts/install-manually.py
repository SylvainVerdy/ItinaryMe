#!/usr/bin/env python
"""
Script d'installation des dépendances pour browser-use
Ce script installe les bibliothèques Python nécessaires pour utiliser browser-use
dans l'environnement Python actuel.
"""

import sys
import subprocess
import os
import platform

def print_header(message):
    """Affiche un message formaté comme en-tête"""
    print("\n" + "=" * 80)
    print(f" {message}")
    print("=" * 80)

def run_command(command):
    """Exécute une commande shell et affiche la sortie"""
    print(f"\n> {command}")
    try:
        process = subprocess.run(command, shell=True, check=True, 
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 universal_newlines=True)
        if process.stdout:
            print(process.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Erreur: {e}")
        if e.stderr:
            print(e.stderr)
        return False

def check_module_installed(module_name):
    """Vérifie si un module Python est installé"""
    try:
        __import__(module_name)
        print(f"✓ Module {module_name} est installé correctement")
        return True
    except ImportError:
        print(f"✗ Module {module_name} n'est pas installé")
        return False

def get_python_version():
    """Retourne la version de Python au format string"""
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

def check_python_version():
    """Vérifie que la version de Python est compatible avec PyTorch (< 3.13)"""
    major = sys.version_info.major
    minor = sys.version_info.minor
    
    if major == 3 and minor >= 13:
        print_header("AVERTISSEMENT: Version de Python incompatible")
        print(f"Python {get_python_version()} détecté.")
        print("La fonctionnalité de mémoire dans browser-use nécessite PyTorch qui n'est pas")
        print("compatible avec Python 3.13+. Veuillez utiliser Python 3.12 ou inférieur.")
        return False
    elif major < 3 or (major == 3 and minor < 8):
        print_header("AVERTISSEMENT: Version de Python trop ancienne")
        print(f"Python {get_python_version()} détecté.")
        print("browser-use requiert Python 3.8 ou supérieur.")
        print("Veuillez utiliser Python 3.8-3.12 pour une compatibilité optimale.")
        return False
    else:
        print(f"✓ Python {get_python_version()} est compatible avec PyTorch et browser-use")
        return True

def check_ollama():
    """Vérifie si Ollama est installé et en cours d'exécution"""
    try:
        import requests
        resp = requests.get("http://localhost:11434/api/version")
        if resp.status_code == 200:
            data = resp.json()
            print(f"✓ Ollama détecté (version: {data.get('version', 'inconnue')})")
            return True
        else:
            print(f"✗ Ollama semble être installé mais ne répond pas (code {resp.status_code})")
            return False
    except Exception as e:
        print(f"✗ Ollama n'est pas accessible: {e}")
        print("  Assurez-vous qu'Ollama est installé et que le serveur est démarré.")
        print("  Commande: ollama serve")
        return False

def check_ollama_model(model="qwen2.5"):
    """Vérifie si le modèle Ollama spécifié est installé"""
    try:
        import requests
        resp = requests.get("http://localhost:11434/api/tags")
        if resp.status_code == 200:
            models = resp.json().get("models", [])
            model_names = [m.get("name") for m in models]
            if model in model_names:
                print(f"✓ Modèle {model} est installé")
                return True
            else:
                print(f"✗ Modèle {model} n'est pas installé.")
                print(f"  Modèles disponibles: {', '.join(model_names) if model_names else 'aucun'}")
                
                install = input(f"Voulez-vous installer le modèle {model}? (o/n): ")
                if install.lower() == 'o':
                    print(f"Installation du modèle {model}...")
                    run_command(f"ollama pull {model}")
                    return True
                return False
        else:
            print(f"✗ Impossible de récupérer la liste des modèles (code {resp.status_code})")
            return False
    except Exception as e:
        print(f"✗ Erreur lors de la vérification du modèle: {e}")
        return False

def main():
    """Fonction principale d'installation"""
    print_header("Installation des dépendances pour browser-use")
    
    # Afficher les informations système
    print(f"Python: {get_python_version()}")
    print(f"Système: {platform.system()} {platform.release()}")
    print(f"Chemin Python: {sys.executable}")
    
    # Vérifier la compatibilité de la version Python
    if not check_python_version():
        response = input("\nSouhaitez-vous continuer malgré la version incompatible? (o/n): ")
        if response.lower() != 'o':
            print("Installation annulée. Veuillez utiliser une version compatible de Python.")
            sys.exit(1)
        print("\nContinuation de l'installation malgré les avertissements...")
    
    # Mettre à jour pip
    print_header("Mise à jour de pip")
    run_command(f"{sys.executable} -m pip install --upgrade pip")
    
    # Installer les dépendances
    print_header("Installation des bibliothèques requises")
    
    # 1. Installer browser-use avec les fonctionnalités de mémoire
    print("Installation de browser-use (module importé comme browser_use)...")
    run_command(f"{sys.executable} -m pip install 'browser-use'")
    
    # Version spécifique de langchain compatible avec Python 3.13
    if sys.version_info.major == 3 and sys.version_info.minor >= 13:
        print("Installation des dépendances pour Python 3.13+...")
        run_command(f"{sys.executable} -m pip install 'langchain>=0.1.0'")
        run_command(f"{sys.executable} -m pip install 'langchain-core>=0.1.0'")
    else:
        print("Installation des dépendances avec support mémoire...")
        run_command(f"{sys.executable} -m pip install 'torch'")
    
    # 2. Installer langchain_ollama avec la version correcte
    run_command(f"{sys.executable} -m pip install 'langchain_ollama>=0.0.4'")
    
    # 3. Installer langchain_serp pour la recherche internet
    run_command(f"{sys.executable} -m pip install langchain_serp")
    
    # 4. Installer playwright
    run_command(f"{sys.executable} -m pip install playwright")
    
    # 5. Installer les navigateurs pour playwright
    run_command(f"{sys.executable} -m playwright install chromium")
    
    # Vérifier les installations
    print_header("Vérification des installations")
    all_installed = True
    
    # Vérifier browser_use (le plus important)
    try:
        __import__("browser_use")
        print("✓ Module browser_use est installé correctement")
    except ImportError:
        print("✗ Module browser_use n'est pas installé")
        print("Tentative de résolution:")
        run_command(f"{sys.executable} -m pip install --force-reinstall 'browser-use'")
        all_installed = False
    
    # Vérifier langchain_ollama
    try:
        __import__("langchain_ollama")
        print("✓ Module langchain_ollama est installé correctement")
    except ImportError:
        print("✗ Module langchain_ollama n'est pas installé")
        all_installed = False
    
    # Vérifier playwright
    try:
        __import__("playwright")
        print("✓ Module playwright est installé correctement")
    except ImportError:
        print("✗ Module playwright n'est pas installé")
        all_installed = False
    
    # Vérifier si Ollama est installé et en cours d'exécution
    print_header("Vérification d'Ollama")
    ollama_ok = check_ollama()
    if ollama_ok:
        check_ollama_model("qwen2.5")
    
    if all_installed:
        print_header("Installation réussie ✓")
        print("Toutes les dépendances ont été installées correctement.")
        print("Vous pouvez maintenant utiliser browser-use dans votre application ItinaryMe!")
        
        # Vérifier si PyTorch est installé correctement pour les fonctionnalités de mémoire
        if not (sys.version_info.major == 3 and sys.version_info.minor >= 13):
            try:
                __import__("torch")
                print("✓ PyTorch est installé - les fonctionnalités de mémoire sont disponibles")
            except ImportError:
                print("! PyTorch n'est pas installé ou a rencontré un problème.")
                print("Les fonctionnalités de mémoire pourraient ne pas fonctionner correctement.")
                print("Pour les activer, essayez: pip install torch")
        
        # Créer un script de test
        print_header("Création d'un script de test")
        test_script = """
from browser_use import Agent
from langchain_ollama import ChatOllama
import asyncio
import os
from dotenv import load_dotenv

# Charge les variables d'environnement
load_dotenv()

async def main():
    try:
        # Configuration spécifique pour Ollama
        llm = ChatOllama(
            model="qwen2.5",
            format="json",  # Format explicite pour résoudre l'erreur de sérialisation
            temperature=0.7,
            base_url="http://localhost:11434"  # URL explicite vers Ollama
        )
        
        # Tâche simple pour tester l'installation
        print("Démarrage de l'agent browser-use...")
        agent = Agent(
            task="Ouvrir google.com et rechercher 'itinary me travel app'",
            llm=llm,
            max_steps=5,
            browser_kwargs={"headless": False}
        )
        
        print("Exécution de la tâche...")
        await agent.run()
        print("Test réussi! L'agent a terminé sa tâche.")
    except Exception as e:
        print(f"Erreur durant le test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
"""
        
        # Écrire le script dans un fichier
        with open("test_browser_use.py", "w") as f:
            f.write(test_script)
        
        print("Un script de test a été créé: test_browser_use.py")
        print("Pour tester l'installation, exécutez:")
        print(f"{sys.executable} test_browser_use.py")
    else:
        print_header("Installation incomplète ✗")
        print("Certaines dépendances n'ont pas été installées correctement.")
        print("Veuillez résoudre les problèmes mentionnés ci-dessus et réessayer.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Une erreur s'est produite pendant l'installation: {e}")
        print("\nInformations de diagnostic:")
        print(f"- Python: {sys.version}")
        print(f"- Chemin Python: {sys.executable}")
        print(f"- Répertoire de travail: {os.getcwd()}")
        try:
            import site
            print(f"- Répertoire site-packages: {site.getsitepackages()}")
        except:
            pass
        print("\nEssayez d'installer manuellement:")
        print("python -m pip install --upgrade pip")
        print("python -m pip install browser-use")
        print("python -m pip install langchain_ollama langchain_serp playwright")
        print("playwright install chromium") 
