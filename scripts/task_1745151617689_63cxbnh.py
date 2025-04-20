
from langchain_ollama import ChatOllama
from browser_use import Agent
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

# Configuration de SerpAPI pour la recherche web
os.environ["SERPAPI_API_KEY"] = "46ceae7f12b92954fc5bd8f0834cd0b797b6ea2542b343748874f9987c92f7f8"

async def main():
    agent = Agent(
        task="Recherche un hotel en crete avec vue pour mon sejour du 24 au 27 avril 2025 dans la capitale",
        llm=ChatOllama(model="mlaprise/gemma-3-4b-it-qat-q4_0-gguf"),
    )
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
