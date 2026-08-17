# Literature Survey

## ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

---

## 1. Introduction

This literature survey examines existing work across five key domains that form the foundation of ResearchNode: (1) Retrieval-Augmented Generation, (2) Knowledge Graphs for Scientific Literature, (3) Graph-based RAG systems, (4) Multi-Agent AI Systems, and (5) Scientific Document Processing. The survey identifies the strengths and limitations of current approaches and establishes the motivation for our integrated solution.

---

## 2. Retrieval-Augmented Generation (RAG)

### 2.1 Foundation

Lewis et al. (2020) introduced **Retrieval-Augmented Generation (RAG)** in their seminal paper *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"*. The core idea is to augment a language model's generation with relevant documents retrieved from an external knowledge base, reducing hallucination and grounding responses in factual sources.

> **Reference:** Lewis, P., Perez, E., Piktus, A., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *NeurIPS 2020*.

### 2.2 Vector-Based Retrieval

Modern RAG systems use dense vector embeddings to retrieve semantically similar documents. Key embedding models include:

| Model | Dimensions | Use Case |
|-------|-----------|----------|
| all-MiniLM-L6-v2 | 384 | General-purpose, lightweight |
| text-embedding-ada-002 | 1536 | OpenAI's commercial offering |
| BGE-large-en | 1024 | Open-source, high quality |
| e5-large-v2 | 1024 | Multilingual support |

Vector databases such as **Qdrant**, **Pinecone**, **Weaviate**, and **ChromaDB** provide efficient approximate nearest neighbor (ANN) search for retrieval.

> **Reference:** Reimers, N. & Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. *EMNLP 2019*.

### 2.3 Limitations of Standard RAG

Standard RAG has notable limitations:
- **No structural awareness** — treats all documents as flat text chunks
- **Context window limits** — cannot reason over hundreds of papers simultaneously
- **No relationship reasoning** — cannot answer "how does X relate to Y across papers?"
- **Retrieval noise** — semantically similar but irrelevant chunks may be retrieved

These limitations directly motivate the GraphRAG approach used in ResearchNode.

---

## 3. Knowledge Graphs in Scientific Literature

### 3.1 Microsoft Academic Knowledge Graph

The **Microsoft Academic Knowledge Graph (MAKG)** represents over 200 million academic publications with entities such as papers, authors, institutions, fields of study, and venues, connected by relationships like *authored-by*, *published-in*, and *cites*.

> **Reference:** Färber, M., Bartscherer, F., Menne, C., & Rettinger, A. (2018). Linked Data for Science and Education. *Semantic Web Journal*.

### 3.2 Open Research Knowledge Graph (ORKG)

The **ORKG** project by TIB Hannover aims to create a scholarly knowledge graph where research contributions are represented as structured, comparable, and machine-readable data. Papers are decomposed into problems, methods, results, and materials.

> **Reference:** Jaradeh, M.Y., Oelen, A., Farfar, K.E., et al. (2019). Open Research Knowledge Graph: Next Generation Infrastructure for Semantic Scholarly Knowledge. *K-CAP 2019*.

### 3.3 SciGraph by Springer Nature

**SciGraph** aggregates data from Springer Nature publications, grants, conferences, and affiliations into a linked open data knowledge graph, enabling exploration of the research landscape.

> **Reference:** Springer Nature SciGraph. (2017). Linked Open Data Platform for Scholarly Information.

### 3.4 Limitations of Existing Scientific KGs

| System | Limitation |
|--------|-----------|
| MAKG | Metadata only, no content-level concepts |
| ORKG | Requires manual curation, not automated |
| SciGraph | Publisher-specific, closed ecosystem |

ResearchNode addresses these by **automatically** extracting content-level entities (methods, models, datasets, tasks) from uploaded papers and building the graph programmatically.

---

## 4. GraphRAG — Graph-Enhanced Retrieval-Augmented Generation

### 4.1 Microsoft GraphRAG

Microsoft Research introduced **GraphRAG** (2024), which constructs a knowledge graph from a text corpus using LLM-based entity and relationship extraction, then uses graph community detection to create hierarchical summaries. Queries are answered by combining graph-structural context with text retrieval.

> **Reference:** Edge, D., Trinh, H., Cheng, N., et al. (2024). From Local to Global: A Graph RAG Approach to Query-Focused Summarization. *Microsoft Research*.

### 4.2 LlamaIndex Knowledge Graph RAG

**LlamaIndex** provides a `KnowledgeGraphIndex` that constructs a knowledge graph from documents and uses it as a retrieval source. It supports Neo4j, Nebula Graph, and in-memory graph stores.

> **Reference:** Liu, J. (2022). LlamaIndex: Data Framework for LLM Applications. *GitHub*.

### 4.3 Neo4j + LangChain Integration

**LangChain** provides `Neo4jGraph` and `GraphCypherQAChain` components that enable natural language queries to be translated into Cypher queries, executed against a Neo4j database, and the results used as context for LLM generation.

> **Reference:** Chase, H. (2022). LangChain: Building Applications with LLMs through Composability. *GitHub*.

### 4.4 Comparison

| Approach | Graph Construction | Query Method | Limitation |
|----------|-------------------|-------------|------------|
| Microsoft GraphRAG | LLM-extracted entities | Community summaries | High token cost, batch-only |
| LlamaIndex KG | Triplet extraction | Graph traversal | Simple triplets, no agents |
| Neo4j + LangChain | Manual or LLM | Cypher translation | No vector search integration |
| **ResearchNode** | **NLP + LLM hybrid** | **Graph + Vector + Agents** | **MVP scope** |

ResearchNode combines the strengths of all three: automated graph construction, hybrid graph+vector retrieval, and multi-agent reasoning.

---

## 5. Multi-Agent AI Systems

### 5.1 AutoGen (Microsoft)

**AutoGen** enables building multi-agent conversation systems where specialized agents collaborate to solve complex tasks. Agents can be configured with different LLMs, tools, and roles.

> **Reference:** Wu, Q., Bansal, G., Zhang, J., et al. (2023). AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation. *Microsoft Research*.

### 5.2 CrewAI

**CrewAI** provides a framework for orchestrating role-playing AI agents that work together on complex tasks. Each agent has a defined role, goal, and backstory, and they collaborate through a structured workflow.

> **Reference:** Moura, J. (2024). CrewAI: Framework for Orchestrating Role-Playing AI Agents. *GitHub*.

### 5.3 LangGraph

**LangGraph** by LangChain enables building stateful, multi-actor applications with LLMs. It models agent workflows as graphs where nodes are computation steps and edges define the flow.

> **Reference:** LangChain. (2024). LangGraph: Building Stateful Multi-Agent Applications. *GitHub*.

### 5.4 Application to Scientific Reasoning

Multi-agent systems have been applied to scientific reasoning in:
- **ChemCrow** — agents for chemistry tasks (synthesis planning, safety assessment)
- **SciAgents** — collaborative agents for hypothesis generation
- **ResearchAgent** — automated literature review with agent collaboration

ResearchNode adapts this paradigm with three domain-specific agents: Literature Discovery, Contradiction Detection, and Experiment Suggestion.

---

## 6. Scientific Document Processing

### 6.1 PDF Text Extraction

| Tool | Method | Quality |
|------|--------|---------|
| PyMuPDF (fitz) | Direct text extraction | High for text-based PDFs |
| PDFMiner | Layout-aware extraction | Good for complex layouts |
| GROBID | ML-based scholarly parsing | Best for academic papers |
| Nougat (Meta) | OCR + Vision Transformer | Best for math-heavy papers |

### 6.2 Named Entity Recognition for Science

Scientific NER has been addressed by:
- **SciBERT** — BERT pretrained on scientific text (Beltagy et al., 2019)
- **SciSpaCy** — spaCy models trained on biomedical/scientific text
- **ChatGPT/LLM-based extraction** — using prompts to extract entities

> **Reference:** Beltagy, I., Lo, K., & Cohan, A. (2019). SciBERT: A Pretrained Language Model for Scientific Text. *EMNLP 2019*.

### 6.3 Chunking Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Fixed-size | Split at character count | Simple, fast |
| Recursive | Split at natural boundaries | General purpose (used in ResearchNode) |
| Semantic | Split by topic coherence | High quality, slower |
| Section-based | Split by paper sections | Academic papers |

---

## 7. Summary of Gaps in Existing Work

| Gap | Description | How ResearchNode Addresses It |
|-----|------------|-------------------------------|
| No integrated Graph+Vector RAG for uploaded papers | Existing tools use either graphs OR vectors, not both | Combines Neo4j knowledge graph with Qdrant vector search |
| No automated contradiction detection | No tool systematically finds conflicting findings | Contradiction Detection Agent analyzes graph for conflicting edges |
| No research gap detection from graph structure | Missing relationships are invisible in flat search | Graph analysis identifies missing edges as potential research opportunities |
| No multi-agent reasoning over scientific KGs | Agents exist for general tasks but not KG-based science | Three specialized agents reason over the knowledge graph |
| No user-uploadable, auto-graphed paper system | Existing KGs require manual curation or API access | Users upload PDFs; the system auto-extracts and builds the graph |

---

## 8. References

1. Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* NeurIPS 2020.
2. Reimers, N. & Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* EMNLP 2019.
3. Färber, M., et al. (2018). *Linked Data for Science and Education.* Semantic Web Journal.
4. Jaradeh, M.Y., et al. (2019). *Open Research Knowledge Graph.* K-CAP 2019.
5. Edge, D., et al. (2024). *From Local to Global: A Graph RAG Approach to Query-Focused Summarization.* Microsoft Research.
6. Liu, J. (2022). *LlamaIndex: Data Framework for LLM Applications.* GitHub.
7. Chase, H. (2022). *LangChain: Building Applications with LLMs through Composability.* GitHub.
8. Wu, Q., et al. (2023). *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation.* Microsoft Research.
9. Moura, J. (2024). *CrewAI: Framework for Orchestrating Role-Playing AI Agents.* GitHub.
10. Beltagy, I., Lo, K., & Cohan, A. (2019). *SciBERT: A Pretrained Language Model for Scientific Text.* EMNLP 2019.
11. LangChain. (2024). *LangGraph: Building Stateful Multi-Agent Applications.* GitHub.
12. Springer Nature. (2017). *SciGraph: Linked Open Data Platform for Scholarly Information.*
