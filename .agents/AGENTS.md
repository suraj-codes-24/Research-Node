# ResearchNode — Project Context

> This file is the living memory for this project. It is read automatically at the start of every conversation. Update it as the project evolves.

---

## Project Overview

**ResearchNode** is a GraphRAG Reasoning Engine for Scientific Literature — a college mini project.

- Upload research papers (PDF) → extract text → chunk → embed → store in Qdrant
- Build a knowledge graph in Neo4j (entities: models, methods, datasets, tasks, authors)
- GraphRAG: combine vector search + graph traversal for question answering
- Multi-agent system: Literature Discovery, Contradiction Detection, Experiment Suggestion
- Frontend: React + Vite with Cytoscape.js graph visualization

## Key Decisions

| Decision | Choice | Date |
|----------|--------|------|
| LLM Provider | Google Gemini API (free tier) | 2026-07-27 |
| Embedding Model | all-MiniLM-L6-v2 (384 dims) | 2026-07-27 |
| Vector Database | Qdrant (local) | 2026-07-27 |
| Graph Database | Neo4j (add later, not required for initial phases) | 2026-07-27 |
| Frontend Framework | React + Vite | 2026-07-27 |
| Backend Framework | FastAPI + Uvicorn | 2026-07-27 |
| Build Approach | Step-by-step, educational | 2026-07-27 |
| Python Version | 3.12 | 2026-07-27 |

## Build Order

```
Phase A: Backend Foundation          ← CURRENT
  ① Project setup + FastAPI skeleton
  ② PDF upload + text extraction
  ③ Text chunking

Phase B: Embeddings + Vector Search
  ④ Embedding generation (Sentence Transformers)
  ⑤ Qdrant setup + vector storage/search

Phase C: RAG Pipeline
  ⑥ Gemini API integration
  ⑦ Basic RAG (question → retrieve → LLM answer)

Phase D: Knowledge Graph
  ⑧ Neo4j setup + entity extraction
  ⑨ Graph builder + GraphRAG (hybrid retrieval)

Phase E: Frontend
  ⑩ React + Vite app
  ⑪ Upload page, Chat page, Graph visualization

Phase F: Agents
  ⑫ Literature, Contradiction, Experiment agents
```

## Current Progress

- [x] Pre-documents created (docs/ folder — 12 files)
- [x] Phase A: Backend Foundation
- [x] Phase B: Embeddings + Vector Search
- [x] Phase C: RAG Pipeline
- [x] Phase D: Knowledge Graph
- [x] Phase E: Frontend
- [x] Phase F: Agents

## Environment

- **OS:** Windows
- **Python:** 3.12
- **Gemini API Key:** Configured (env var: GEMINI_API_KEY)
- **Qdrant:** NOT YET INSTALLED
- **Neo4j:** NOT YET INSTALLED
- **Node.js:** (check version before frontend phase)

---

## Project Structure

```
RAG-Project/
├── .agents/
│   └── AGENTS.md              ← THIS FILE (project memory)
├── docs/                       ← Pre-documents (frozen, for submission — DO NOT MODIFY)
│   ├── 00_predocuments_index.md
│   ├── 01_abstract.md
│   ├── 02_problem_statement.md
│   ├── 03_literature_survey.md
│   ├── 04_system_requirements_specification.md
│   ├── 05_system_design_document.md
│   ├── 06_feasibility_study.md
│   ├── 07_module_description.md
│   ├── 08_technology_stack.md
│   ├── 09_project_plan_timeline.md
│   ├── 10_uml_diagrams.md
│   ├── 11_testing_plan.md
│   └── judge_presentation_guide.md
├── backend/
│   ├── main.py                 ← FastAPI app init, CORS, startup/shutdown
│   ├── config.py               ← Env vars, settings (Pydantic BaseSettings)
│   ├── requirements.txt
│   ├── api/
│   │   ├── __init__.py
│   │   ├── upload.py           ← POST /api/upload-paper, GET /api/papers
│   │   └── query.py            ← POST /api/query, GET /api/graph, agent endpoints
│   ├── pdf_processing/
│   │   ├── __init__.py
│   │   ├── extractor.py        ← PDFExtractor class (PyMuPDF)
│   │   └── cleaner.py          ← TextCleaner class (regex normalization)
│   ├── embeddings/
│   │   ├── __init__.py
│   │   └── embedder.py         ← EmbeddingGenerator, VectorStoreManager, TextChunker
│   ├── graph/
│   │   ├── __init__.py
│   │   ├── neo4j_service.py    ← Neo4jService class
│   │   └── graph_builder.py    ← EntityExtractor, RelationshipIdentifier
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── retriever.py        ← HybridRetriever (vector + graph)
│   │   └── generator.py        ← AnswerGenerator (LLM + prompt)
│   └── agents/
│       ├── __init__.py
│       ├── literature.py       ← LiteratureAgent
│       ├── contradiction.py    ← ContradictionAgent
│       └── experiment.py       ← ExperimentAgent
├── frontend/                    ← React + Vite (Phase E)
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── Dashboard.jsx
│           ├── Upload.jsx
│           ├── Chat.jsx
│           └── Graph.jsx
├── papers/                      ← Uploaded PDFs stored here
└── database/                    ← DB config/data if needed
```

---

## API Endpoints (from SRS doc 04)

| Method | Endpoint | Description | Phase |
|--------|----------|-------------|-------|
| `GET` | `/health` | Health check | A |
| `POST` | `/api/upload-paper` | Upload PDF (multipart/form-data) → returns `{paper_id, title, status}` | A |
| `GET` | `/api/papers` | List all uploaded papers | A |
| `GET` | `/api/papers/{id}` | Get paper details | A |
| `DELETE` | `/api/papers/{id}` | Delete paper + its vectors/graph data | A |
| `POST` | `/api/query` | Ask question → returns `{answer, citations[], graph_context}` | C |
| `GET` | `/api/graph` | Full knowledge graph (nodes + edges) for Cytoscape | D |
| `GET` | `/api/graph/{paper_id}` | Subgraph for one paper | D |
| `POST` | `/api/agents/literature` | Literature Discovery Agent `{topic: str}` | F |
| `POST` | `/api/agents/contradiction` | Contradiction Detection Agent | F |
| `POST` | `/api/agents/experiment` | Experiment Suggestion Agent | F |
| `GET` | `/api/recommendations` | AI-generated research recommendations | F |

---

## Database Schemas

### Qdrant — Collection: `research_chunks`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique chunk identifier |
| `vector` | float[384] | Embedding from all-MiniLM-L6-v2 |
| `payload.paper_id` | string | Reference to source paper |
| `payload.paper_title` | string | Paper title |
| `payload.chunk_index` | integer | Position in the paper |
| `payload.chunk_text` | string | Original text content |
| `payload.section` | string | Paper section (abstract, method, etc.) |

Distance metric: **Cosine**. Port: **6333**.

### Neo4j — Graph Schema

**Node types:**
- `Paper` — name, title, year, abstract, source_file, upload_date
- `Model` — name, type, parameters, year_introduced
- `Method` — name, category, description
- `Dataset` — name, domain, size, task_type
- `Task` — name, domain, description
- `Author` — name, affiliation, email

**Relationship types:**
- `USES` — Paper → Model/Method
- `EVALUATED_ON` — Model → Dataset
- `APPLIED_TO` — Method → Task
- `CITES` — Paper → Paper
- `AUTHORED_BY` — Paper → Author
- `COMPARED_WITH` — Model → Model
- `IMPROVES_ON` — Model → Model

All nodes use **MERGE** (not CREATE) to prevent duplicates.
Uniqueness constraints on `name` for each node type.
Port: **7687** (Bolt protocol).

---

## Key Classes to Implement (from Module Description doc 07)

### Phase A
- `PDFExtractor` — `extract(path) → str`, `extract_metadata(path) → dict`
- `TextCleaner` — `clean(text) → str`, `split_sections(text) → dict`
- `TextChunker` — `chunk(text) → list[str]` (chunk_size=1000, overlap=200)

### Phase B
- `EmbeddingGenerator` — `embed(text) → ndarray[384]`, `embed_batch(texts) → ndarray`
- `VectorStoreManager` — `store(embeddings, metadata) → list[str]`, `search(query_vector, top_k) → list[dict]`

### Phase C
- `AnswerGenerator` — `generate(question, context) → {answer, citations, confidence}`

### Phase D
- `Neo4jService` — `create_paper_node()`, `create_entity_node()`, `create_relationship()`, `get_paper_subgraph()`, `get_full_graph()`, `query()`, `find_research_gaps()`, `close()`
- `NERExtractor` — `extract_entities(text) → list[dict]` (spaCy)
- `LLMEntityExtractor` — `extract_structured(text) → dict` (Gemini)
- `RelationshipIdentifier` — `identify(entities, text) → list[dict]`
- `HybridRetriever` — `retrieve(query, top_k) → {vector_chunks, graph_context, combined_context}`

### Phase F
- `LiteratureAgent` — `run(topic) → {related_papers, relationship_summary, suggested_reading_order}`
- `ContradictionAgent` — `run() → {contradictions: [{paper_a, paper_b, claim_a, claim_b, explanation, severity}]}`
- `ExperimentAgent` — `run() → {suggestions: [{experiment, rationale, required_resources, novelty_score, based_on}]}`

---

## Dependencies (pip install)

### Phase A (Backend Foundation)
```
fastapi
uvicorn[standard]
python-multipart
pymupdf
langchain
langchain-community
pydantic-settings
```

### Phase B (Embeddings)
```
sentence-transformers
qdrant-client
```

### Phase C (RAG)
```
langchain-google-genai
# or: google-generativeai
```

### Phase D (Knowledge Graph)
```
neo4j
spacy
# then: python -m spacy download en_core_web_sm
```

### Phase E (Frontend — npm)
```
react
react-dom
react-router-dom
axios
cytoscape
```

---

## Non-Functional Requirements (from SRS doc 04)

| Metric | Target |
|--------|--------|
| PDF extraction (20 pages) | < 5 seconds |
| Embedding generation (50 chunks) | < 10 seconds |
| Vector search (top-10) | < 500 ms |
| Graph query (Cypher) | < 2 seconds |
| RAG full response | < 15 seconds |
| Max PDF size | 50 MB |
| Max papers (MVP) | 50 |
| Max graph nodes | 1,000 |
| Max vectors | 10,000 |
| UI responsive width | ≥ 1024px |

---

## Test Cases to Verify (from Testing Plan doc 11)

| ID | What | Priority | Phase |
|----|------|----------|-------|
| TC-01 | Valid PDF upload returns 200 + paper_id | High | A |
| TC-02 | Non-PDF upload returns 400 | High | A |
| TC-03 | Text extraction > 90% accuracy | High | A |
| TC-04 | Scanned PDF → graceful error | Medium | A |
| TC-05 | Chunking: 5000 chars → ~5-6 chunks | High | A |
| TC-06 | Embedding shape = (384,), dtype float32 | High | B |
| TC-07 | Vector search returns similar chunks, score > 0.7 | High | B |
| TC-08 | Neo4j connection succeeds | High | D |
| TC-09 | Paper node created with properties | High | D |
| TC-10 | USES relationship created | High | D |
| TC-11 | Duplicate paper → no duplicate nodes | Medium | D |
| TC-12 | Hybrid retrieval returns both vector + graph context | High | D |
| TC-13 | Answer includes paper citations | High | C |
| TC-14 | Literature agent finds related papers | Medium | F |
| TC-15 | Contradiction agent detects conflicts | Medium | F |
| TC-16 | Experiment agent suggests experiments | Medium | F |
| TC-17 | GET /health returns 200 | High | A |
| TC-18 | CORS headers present | Medium | A |
| TC-19 | Upload UI works end-to-end | High | E |
| TC-20 | Chat UI displays Q&A | High | E |
| TC-21 | Graph renders with colored nodes | High | E |

---

## Frontend Component Specs (from System Design doc 05)

### Graph Visualization — Node Colors & Shapes
- Paper: 🔵 Blue circle
- Model: 🟢 Green diamond
- Method: 🟡 Yellow triangle
- Dataset: 🟠 Orange square
- Task: 🟣 Purple hexagon
- Author: ⚪ Gray circle

### Pages
1. **Dashboard** — paper count, graph stats, quick actions
2. **Upload** — drag-and-drop PDF, progress bar, processing status
3. **Chat** — message history, citation cards, loading indicator, agent results
4. **Graph** — Cytoscape.js canvas, legend, filters, search

---

## RAG Prompt Template (from Module Description doc 07)

```
You are a research assistant. Based on the following context
from research papers, answer the question.

Vector Search Context:
{vector_chunks}

Knowledge Graph Context:
{graph_context}

Question: {question}

Provide a detailed answer with citations to specific papers.
```

---

## Sample Test Papers (from Testing Plan doc 11)

1. "Attention Is All You Need" (Vaswani et al.) — Transformer, self-attention, MT
2. "BERT: Pre-training of Deep Bidirectional Transformers" — BERT, fine-tuning, NLU
3. "ResNet: Deep Residual Learning" — CNN, computer vision (different domain)
4. A contradicting paper — tests contradiction agent
5. A survey paper — tests multi-entity extraction

---

## Notes

- Build backend first, test via Swagger UI (`/docs`), then add frontend
- Qdrant before Neo4j — vector search alone gives a working RAG chatbot
- Pre-docs in docs/ are for academic submission — do NOT modify them
- Use `python-multipart` for file uploads in FastAPI
- CORS must be enabled for `http://localhost:5173` (Vite default port)
- API keys go in env vars, never in code — use `pydantic-settings` for config
- All `__init__.py` files needed for proper Python package imports
- FastAPI Swagger UI at `http://localhost:8000/docs` for testing without frontend
