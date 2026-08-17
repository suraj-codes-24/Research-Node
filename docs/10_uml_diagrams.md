# UML Diagrams

## ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

**Date:** July 2026

---

## 1. Use Case Diagram

```mermaid
graph TB
    subgraph "ResearchNode System"
        UC1["Upload Research Paper"]
        UC2["Ask Question"]
        UC3["View Knowledge Graph"]
        UC4["Run Literature Discovery"]
        UC5["Detect Contradictions"]
        UC6["Get Experiment Suggestions"]
    end

    Actor["👤 Researcher"] --> UC1
    Actor --> UC2
    Actor --> UC3
    Actor --> UC4
    Actor --> UC5
    Actor --> UC6

    UC1 --> E1["Extract Text"]
    UC1 --> E2["Generate Embeddings"]
    UC1 --> E3["Build Knowledge Graph"]
    UC2 --> E4["Vector Search"]
    UC2 --> E5["Graph Traversal"]
    UC2 --> E6["LLM Generation"]

    E1["Extract Text"]
    E2["Generate Embeddings"]
    E3["Build Knowledge Graph"]
    E4["Vector Search"]
    E5["Graph Traversal"]
    E6["LLM Generation"]
```

### Use Case Descriptions

| Use Case | Actor | Description | Precondition | Postcondition |
|----------|-------|-------------|-------------|---------------|
| UC1: Upload Paper | Researcher | Upload a PDF paper for processing | User has a PDF file | Paper is processed, graph updated, vectors stored |
| UC2: Ask Question | Researcher | Ask a natural language question about uploaded papers | At least one paper uploaded | Answer with citations returned |
| UC3: View Graph | Researcher | View the knowledge graph visualization | At least one paper processed | Interactive graph displayed |
| UC4: Literature Discovery | Researcher | Find related papers on a topic | At least one paper uploaded | List of related papers with connections |
| UC5: Contradiction Detection | Researcher | Detect conflicting findings across papers | At least two papers uploaded | List of contradictions with evidence |
| UC6: Experiment Suggestions | Researcher | Get AI-suggested experiments | At least two papers uploaded | List of experimental suggestions |

---

## 2. Class Diagram

```mermaid
classDiagram
    class PDFExtractor {
        -file_path: str
        +extract(path: str) str
        +extract_metadata(path: str) dict
    }

    class TextCleaner {
        +clean(text: str) str
        +split_sections(text: str) dict
    }

    class TextChunker {
        -chunk_size: int
        -chunk_overlap: int
        +chunk(text: str) list~str~
    }

    class EmbeddingGenerator {
        -model: SentenceTransformer
        -model_name: str
        +embed(text: str) ndarray
        +embed_batch(texts: list) ndarray
    }

    class VectorStoreManager {
        -client: QdrantClient
        -collection_name: str
        +store(embeddings, metadata) list~str~
        +search(query_vector, top_k) list~dict~
        +delete_by_paper(paper_id) None
    }

    class Neo4jService {
        -driver: GraphDatabase.driver
        -uri: str
        +create_paper_node(data: dict) str
        +create_entity_node(type, props) str
        +create_relationship(src, tgt, rel) None
        +get_paper_subgraph(paper_id) dict
        +get_full_graph() dict
        +query(cypher: str) list
        +find_research_gaps() list
        +close() None
    }

    class EntityExtractor {
        -nlp: spacy.Language
        +extract_entities(text: str) list~dict~
        +extract_with_llm(text: str) dict
        +identify_relationships(entities, text) list~dict~
    }

    class HybridRetriever {
        -vector_store: VectorStoreManager
        -neo4j: Neo4jService
        -embedder: EmbeddingGenerator
        +retrieve(query: str, top_k: int) dict
    }

    class AnswerGenerator {
        -llm_client: LangChain LLM
        +generate(question: str, context: dict) dict
    }

    class LiteratureAgent {
        -retriever: HybridRetriever
        +run(topic: str) dict
    }

    class ContradictionAgent {
        -neo4j: Neo4jService
        -retriever: HybridRetriever
        +run() dict
    }

    class ExperimentAgent {
        -neo4j: Neo4jService
        -retriever: HybridRetriever
        +run() dict
    }

    PDFExtractor --> TextCleaner : sends raw text
    TextCleaner --> TextChunker : sends clean text
    TextChunker --> EmbeddingGenerator : sends chunks
    EmbeddingGenerator --> VectorStoreManager : sends vectors
    TextCleaner --> EntityExtractor : sends clean text
    EntityExtractor --> Neo4jService : sends entities
    HybridRetriever --> VectorStoreManager : queries vectors
    HybridRetriever --> Neo4jService : queries graph
    HybridRetriever --> EmbeddingGenerator : embeds query
    AnswerGenerator --> HybridRetriever : gets context
    LiteratureAgent --> HybridRetriever : uses retrieval
    ContradictionAgent --> HybridRetriever : uses retrieval
    ContradictionAgent --> Neo4jService : queries graph
    ExperimentAgent --> HybridRetriever : uses retrieval
    ExperimentAgent --> Neo4jService : queries graph
```

---

## 3. Sequence Diagram — Paper Upload

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as FastAPI
    participant PDF as PDFExtractor
    participant Clean as TextCleaner
    participant Chunk as TextChunker
    participant Emb as EmbeddingGenerator
    participant QD as Qdrant
    participant NER as EntityExtractor
    participant Neo as Neo4jService

    User->>UI: Select and upload PDF
    UI->>API: POST /api/upload-paper (file)
    API->>API: Validate file (PDF, <50MB)
    API->>API: Save to papers/ directory

    API->>PDF: extract(file_path)
    PDF-->>API: raw_text

    API->>Clean: clean(raw_text)
    Clean-->>API: cleaned_text

    par Embedding Pipeline
        API->>Chunk: chunk(cleaned_text)
        Chunk-->>API: chunks[]
        API->>Emb: embed_batch(chunks)
        Emb-->>API: vectors[]
        API->>QD: store(vectors, metadata)
        QD-->>API: point_ids[]
    and Graph Pipeline
        API->>NER: extract_entities(cleaned_text)
        NER-->>API: entities[]
        API->>NER: identify_relationships(entities)
        NER-->>API: relationships[]
        API->>Neo: create_paper_node(metadata)
        loop For each entity
            API->>Neo: create_entity_node(entity)
        end
        loop For each relationship
            API->>Neo: create_relationship(rel)
        end
    end

    API-->>UI: {paper_id, title, status: "success"}
    UI-->>User: "Paper uploaded and processed!"
```

---

## 4. Sequence Diagram — Question Answering

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as FastAPI
    participant Ret as HybridRetriever
    participant Emb as EmbeddingGenerator
    participant QD as Qdrant
    participant Neo as Neo4jService
    participant Gen as AnswerGenerator
    participant LLM as LLM API

    User->>UI: Type question
    UI->>API: POST /api/query {question}

    API->>Ret: retrieve(question, top_k=5)

    par Vector Retrieval
        Ret->>Emb: embed(question)
        Emb-->>Ret: query_vector
        Ret->>QD: search(query_vector, top_k=5)
        QD-->>Ret: similar_chunks[]
    and Graph Retrieval
        Ret->>Ret: Extract key terms from question
        Ret->>Neo: query(cypher_for_related_entities)
        Neo-->>Ret: graph_paths[]
    end

    Ret-->>API: {vector_chunks, graph_context}

    API->>Gen: generate(question, context)
    Gen->>Gen: Build prompt with context
    Gen->>LLM: Send prompt
    LLM-->>Gen: generated_answer
    Gen->>Gen: Extract citations
    Gen-->>API: {answer, citations[], confidence}

    API-->>UI: {answer, citations, graph_context}
    UI-->>User: Display answer with citations
```

---

## 5. Activity Diagram — Complete System Flow

```mermaid
graph TD
    Start(("Start")) --> A["User accesses ResearchNode"]
    A --> B{"Action?"}

    B -->|Upload Paper| C["Select PDF file"]
    C --> D["Upload to server"]
    D --> E["Extract text from PDF"]
    E --> F["Clean and normalize text"]
    F --> G["Split into chunks"]
    G --> H["Generate embeddings"]
    H --> I["Store in Qdrant"]
    F --> J["Extract entities"]
    J --> K["Identify relationships"]
    K --> L["Update Neo4j graph"]
    I --> M["Upload complete"]
    L --> M
    M --> B

    B -->|Ask Question| N["Type question"]
    N --> O["Embed question"]
    O --> P["Vector search in Qdrant"]
    N --> Q["Parse question entities"]
    Q --> R["Graph query in Neo4j"]
    P --> S["Merge contexts"]
    R --> S
    S --> T["Generate answer via LLM"]
    T --> U["Display answer + citations"]
    U --> B

    B -->|View Graph| V["Fetch graph data"]
    V --> W["Render with Cytoscape.js"]
    W --> X["Interact with graph"]
    X --> B

    B -->|Run Agent| Y["Select agent type"]
    Y --> Z["Agent analyzes graph + vectors"]
    Z --> AA["Display agent results"]
    AA --> B

    B -->|Exit| End(("End"))
```

---

## 6. Entity-Relationship Diagram (Neo4j Schema)

```mermaid
erDiagram
    PAPER {
        string name PK
        string title
        int year
        string abstract
        string source_file
        date upload_date
    }

    MODEL {
        string name PK
        string type
        string parameters
        int year_introduced
    }

    METHOD {
        string name PK
        string category
        string description
    }

    DATASET {
        string name PK
        string domain
        string size
        string task_type
    }

    TASK {
        string name PK
        string domain
        string description
    }

    AUTHOR {
        string name PK
        string affiliation
        string email
    }

    PAPER ||--o{ MODEL : "USES"
    PAPER ||--o{ METHOD : "USES"
    PAPER ||--o{ DATASET : "EVALUATED_ON"
    PAPER ||--o{ TASK : "ADDRESSES"
    PAPER ||--o{ AUTHOR : "AUTHORED_BY"
    PAPER ||--o{ PAPER : "CITES"
    MODEL ||--o{ DATASET : "EVALUATED_ON"
    MODEL ||--o{ MODEL : "COMPARED_WITH"
    MODEL ||--o{ MODEL : "IMPROVES_ON"
    METHOD ||--o{ TASK : "APPLIED_TO"
```

---

## 7. Component Diagram

```mermaid
graph TB
    subgraph "Client Tier"
        Browser["Web Browser"]
        subgraph "React Application"
            Dashboard["Dashboard Component"]
            Upload["Upload Component"]
            Chat["Chat Component"]
            GraphViz["Graph Visualization Component"]
        end
    end

    subgraph "Server Tier"
        subgraph "FastAPI Application"
            UploadAPI["Upload Router"]
            QueryAPI["Query Router"]
            Middleware["CORS Middleware"]
        end
        subgraph "Processing Pipeline"
            PDFProc["PDF Processor"]
            EmbPipeline["Embedding Pipeline"]
            GraphPipeline["Graph Pipeline"]
        end
        subgraph "Intelligence Layer"
            RAGEngine["GraphRAG Engine"]
            AgentSystem["Multi-Agent System"]
        end
    end

    subgraph "Data Tier"
        Neo4j["Neo4j Graph DB"]
        Qdrant["Qdrant Vector DB"]
        FileStore["File System"]
    end

    subgraph "External Services"
        LLMAPI["LLM API"]
    end

    Browser --> Middleware
    Dashboard --> UploadAPI
    Upload --> UploadAPI
    Chat --> QueryAPI
    GraphViz --> QueryAPI

    UploadAPI --> PDFProc
    PDFProc --> EmbPipeline
    PDFProc --> GraphPipeline
    QueryAPI --> RAGEngine
    QueryAPI --> AgentSystem

    EmbPipeline --> Qdrant
    GraphPipeline --> Neo4j
    RAGEngine --> Qdrant
    RAGEngine --> Neo4j
    RAGEngine --> LLMAPI
    AgentSystem --> RAGEngine
    UploadAPI --> FileStore
```

---

## 8. Deployment Diagram

```mermaid
graph TB
    subgraph "Development Machine"
        subgraph "Frontend Server"
            Node["Node.js Dev Server :3000"]
            ReactApp["React Application"]
        end

        subgraph "Backend Server"
            Uvicorn["Uvicorn ASGI :8000"]
            FastAPI["FastAPI Application"]
            Python["Python 3.12 Runtime"]
        end

        subgraph "Database Servers"
            Neo4jDB["Neo4j Desktop :7687"]
            QdrantDB["Qdrant :6333"]
        end

        subgraph "Local AI"
            OllamaOpt["Ollama (optional) :11434"]
        end
    end

    subgraph "External"
        GeminiAPI["Google Gemini API"]
    end

    ReactApp --> FastAPI
    FastAPI --> Neo4jDB
    FastAPI --> QdrantDB
    FastAPI --> GeminiAPI
    FastAPI --> OllamaOpt
```
