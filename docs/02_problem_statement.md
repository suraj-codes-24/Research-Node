# Problem Statement

## ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

---

## 1. Background

Scientific research output has grown at an unprecedented rate. Over **2.5 million** new research papers are published annually across journals, conferences, and preprint servers. Researchers, especially students and early-career academics, face an overwhelming challenge: not just *finding* relevant papers, but *understanding* how they connect to the broader scientific landscape.

Current tools available to researchers include:

| Tool | Capability | Limitation |
|------|-----------|------------|
| Google Scholar | Keyword search, citation count | No semantic understanding |
| Semantic Scholar | AI-based relevance ranking | Treats papers as isolated units |
| Connected Papers | Visual citation graphs | Only citation links, no concept relationships |
| Elicit | AI-assisted literature review | No knowledge graph, no contradiction detection |
| ChatGPT / Perplexity | General Q&A with web search | No structured knowledge, hallucination risk |

None of these tools build a **structured knowledge graph** of scientific concepts, detect **contradictions** between findings, or suggest **research gaps** based on missing relationships.

---

## 2. Problem Definition

> **How can we build an intelligent system that transforms unstructured research papers into a connected knowledge graph and uses graph-augmented retrieval with multi-agent reasoning to help researchers discover relationships, contradictions, and gaps in scientific literature?**

### Specific Problems Addressed

### 2.1 Information Overload
Researchers spend an estimated **50+ hours** per literature review. Manual reading cannot scale to the volume of published work. An automated system that extracts and connects key concepts would dramatically reduce this burden.

### 2.2 Isolated Document Treatment
Existing search engines rank papers individually. They do not capture that:
- Paper A's **method** was applied to Paper B's **dataset**
- Paper C's **findings** contradict Paper D's **conclusions**
- No paper has yet combined **Model X** with **Dataset Y** (a research gap)

### 2.3 Lack of Cross-Paper Reasoning
Current AI assistants answer questions about individual papers but cannot reason across a corpus. Questions like *"Which methods have been tried for task X but not for task Y?"* require graph-level reasoning that flat retrieval cannot provide.

### 2.4 Missed Research Opportunities
Research gaps — combinations of methods, datasets, and tasks that have not yet been explored — are invisible in traditional search. A knowledge graph where nodes are concepts and edges are relationships makes these gaps structurally detectable as **missing edges**.

---

## 3. Proposed Solution

**ResearchNode** addresses these problems by:

1. **Extracting structured entities** (models, datasets, methods, tasks, authors) from uploaded PDF papers using NLP
2. **Building a Neo4j knowledge graph** where entities are nodes and their relationships (USES, APPLIED_TO, COMPARED_WITH, CITES) are edges
3. **Storing semantic embeddings** of paper chunks in Qdrant for similarity-based retrieval
4. **Combining graph traversal with vector search** (GraphRAG) to retrieve contextually rich, relationship-aware answers
5. **Deploying multi-agent reasoning** where specialized agents analyze the graph for literature connections, contradictions, and experimental suggestions

---

## 4. Scope

### In Scope (MVP)
- PDF upload and text extraction
- Text chunking and embedding generation
- Vector storage and semantic search (Qdrant)
- Knowledge graph construction (Neo4j)
- Entity and relationship extraction from papers
- RAG-based question answering with graph context
- React web interface with graph visualization
- Basic multi-agent system (literature, contradiction, experiment agents)

### Out of Scope (Future Work)
- Real-time paper ingestion from arXiv/PubMed APIs
- Multi-language paper support
- Collaborative multi-user workspaces
- Fine-tuned domain-specific LLMs
- Automated full paper summarization
- Integration with reference managers (Zotero, Mendeley)

---

## 5. Expected Outcome

A functional web application where a user can:

1. **Upload** one or more research papers (PDF)
2. **View** an automatically generated knowledge graph of extracted concepts
3. **Ask** natural language questions and receive answers backed by specific paper citations
4. **Discover** research gaps, contradictions, and related work through AI agents
5. **Visualize** the relationships between papers, methods, datasets, and tasks

---

## 6. Significance

This project demonstrates the practical application of several cutting-edge AI concepts:

- **GraphRAG** — an emerging paradigm that enhances RAG with structured knowledge
- **Multi-Agent Systems** — autonomous AI agents collaborating on complex reasoning tasks
- **Knowledge Graphs** — structured representation of domain knowledge
- **Vector Databases** — modern approach to semantic information retrieval

ResearchNode proves that combining these technologies creates a research tool qualitatively superior to any single approach, making it a meaningful contribution for a college mini project.
