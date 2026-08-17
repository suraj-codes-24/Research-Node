# ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

## Abstract

The exponential growth of scientific literature has created an urgent need for intelligent systems that can not only retrieve relevant research papers but also understand and reason over the complex relationships between scientific concepts, methodologies, datasets, and findings. Traditional keyword-based search engines and even modern semantic search tools treat papers as isolated documents, failing to capture the rich interconnections that define scientific knowledge.

**ResearchNode** is a novel research intelligence platform that combines **Graph-based Retrieval-Augmented Generation (GraphRAG)** with **multi-agent reasoning** to transform scientific papers into a connected knowledge graph. Unlike conventional literature review tools, ResearchNode extracts entities (models, datasets, methods, tasks) from uploaded research papers, constructs a Neo4j knowledge graph capturing their relationships, and stores semantic embeddings in a Qdrant vector database for similarity search.

The system employs three specialized AI agents — a **Literature Discovery Agent**, a **Contradiction Detection Agent**, and an **Experiment Suggestion Agent** — that collaboratively analyze the knowledge graph to surface insights that would be difficult for a human researcher to identify manually. These include research gaps (missing relationships in the graph), contradictions between findings across papers, and novel experimental directions.

The platform is built with a **FastAPI** backend, a **React** frontend featuring an interactive knowledge graph visualization powered by Cytoscape.js, and uses **LangChain** for LLM orchestration. Users can upload PDF papers, ask natural language questions, and receive citation-backed answers enriched with graph-derived context.

ResearchNode demonstrates that combining structured knowledge representation (graphs) with unstructured semantic search (vectors) and agentic reasoning produces significantly richer research insights than any single approach alone.

---

**Keywords:** GraphRAG, Knowledge Graph, Neo4j, Retrieval-Augmented Generation, Multi-Agent Systems, Natural Language Processing, Scientific Literature Analysis, Vector Search, Qdrant, LangChain

**Domain:** Artificial Intelligence, Natural Language Processing, Information Retrieval

**Project Type:** College Mini Project

**Team Size:** Individual / Team (as applicable)
