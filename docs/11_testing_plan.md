# Testing Plan

## ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

**Version:** 1.0  
**Date:** July 2026

---

## 1. Testing Strategy

### 1.1 Testing Levels

| Level | Scope | Tools | When |
|-------|-------|-------|------|
| **Unit Testing** | Individual functions and classes | pytest | During development |
| **Integration Testing** | Module interactions (e.g., PDF → Qdrant) | pytest, requests | After each module |
| **System Testing** | End-to-end workflows | Manual + Postman | Week 6 |
| **User Acceptance Testing** | User perspective validation | Manual | Week 6 |

### 1.2 Testing Environment

| Component | Configuration |
|-----------|-------------|
| OS | Windows 10/11 |
| Python | 3.12 |
| Neo4j | Community Edition (local) |
| Qdrant | Local instance (Docker/standalone) |
| Browser | Chrome / Firefox (latest) |
| API Testing | Postman / curl |

---

## 2. Test Cases

### Module 1 — PDF Processing

#### TC-01: Valid PDF Upload

| Attribute | Value |
|-----------|-------|
| **ID** | TC-01 |
| **Module** | PDF Processing |
| **Description** | Upload a valid PDF research paper |
| **Precondition** | Backend server running |
| **Input** | Valid PDF file (< 50 MB) |
| **Steps** | 1. Send POST to `/api/upload-paper` with PDF file |
| **Expected Result** | Status 200, `{paper_id, title, status: "success"}` |
| **Priority** | High |

#### TC-02: Invalid File Upload

| Attribute | Value |
|-----------|-------|
| **ID** | TC-02 |
| **Module** | PDF Processing |
| **Description** | Upload a non-PDF file |
| **Input** | `.txt` or `.jpg` file |
| **Steps** | 1. Send POST to `/api/upload-paper` with non-PDF file |
| **Expected Result** | Status 400, error message: "Only PDF files are accepted" |
| **Priority** | High |

#### TC-03: Text Extraction Quality

| Attribute | Value |
|-----------|-------|
| **ID** | TC-03 |
| **Module** | PDF Processing |
| **Description** | Verify text extraction produces readable output |
| **Input** | PDF with known content |
| **Steps** | 1. Extract text using `PDFExtractor` 2. Compare with expected text |
| **Expected Result** | Extracted text matches expected content (> 90% accuracy) |
| **Priority** | High |

#### TC-04: Empty PDF Handling

| Attribute | Value |
|-----------|-------|
| **ID** | TC-04 |
| **Module** | PDF Processing |
| **Description** | Handle a PDF with no extractable text (scanned image) |
| **Input** | Image-only PDF |
| **Expected Result** | Graceful error: "No text could be extracted from this PDF" |
| **Priority** | Medium |

---

### Module 2 — Embedding Pipeline

#### TC-05: Text Chunking

| Attribute | Value |
|-----------|-------|
| **ID** | TC-05 |
| **Module** | Embedding Pipeline |
| **Description** | Verify text is split into chunks of correct size |
| **Input** | 5000-character text string |
| **Steps** | 1. Run `TextChunker.chunk(text)` |
| **Expected Result** | 5-6 chunks, each ~1000 chars, with 200-char overlap between consecutive chunks |
| **Priority** | High |

#### TC-06: Embedding Generation

| Attribute | Value |
|-----------|-------|
| **ID** | TC-06 |
| **Module** | Embedding Pipeline |
| **Description** | Verify embedding dimensions and type |
| **Input** | "Transformer architecture for NLP" |
| **Steps** | 1. Run `EmbeddingGenerator.embed(text)` |
| **Expected Result** | NumPy array of shape (384,), dtype float32 |
| **Priority** | High |

#### TC-07: Vector Storage and Retrieval

| Attribute | Value |
|-----------|-------|
| **ID** | TC-07 |
| **Module** | Embedding Pipeline |
| **Description** | Store vectors and retrieve similar ones |
| **Input** | 10 sample chunks with embeddings |
| **Steps** | 1. Store all in Qdrant 2. Search with a related query |
| **Expected Result** | Top result is semantically similar to query, score > 0.7 |
| **Priority** | High |

---

### Module 3 — Knowledge Graph

#### TC-08: Neo4j Connection

| Attribute | Value |
|-----------|-------|
| **ID** | TC-08 |
| **Module** | Knowledge Graph |
| **Description** | Verify Neo4j connection is established |
| **Precondition** | Neo4j running on localhost:7687 |
| **Steps** | 1. Initialize `Neo4jService` 2. Run a test query |
| **Expected Result** | Connection successful, query returns result |
| **Priority** | High |

#### TC-09: Node Creation

| Attribute | Value |
|-----------|-------|
| **ID** | TC-09 |
| **Module** | Knowledge Graph |
| **Description** | Create a Paper node with properties |
| **Input** | `{name: "BERT Paper", title: "BERT: Pre-training...", year: 2019}` |
| **Steps** | 1. Call `create_paper_node(data)` 2. Query Neo4j to verify |
| **Expected Result** | Node exists with correct properties |
| **Priority** | High |

#### TC-10: Relationship Creation

| Attribute | Value |
|-----------|-------|
| **ID** | TC-10 |
| **Module** | Knowledge Graph |
| **Description** | Create a USES relationship between Paper and Model |
| **Input** | Paper: "BERT Paper", Model: "BERT" |
| **Steps** | 1. Create both nodes 2. Create relationship 3. Query to verify |
| **Expected Result** | `(BERT Paper)-[:USES]->(BERT)` exists in graph |
| **Priority** | High |

#### TC-11: Duplicate Prevention

| Attribute | Value |
|-----------|-------|
| **ID** | TC-11 |
| **Module** | Knowledge Graph |
| **Description** | Uploading the same paper twice should not create duplicate nodes |
| **Input** | Same paper uploaded twice |
| **Expected Result** | Only one Paper node exists; relationships are not duplicated |
| **Priority** | Medium |

---

### Module 4 — GraphRAG Engine

#### TC-12: Hybrid Retrieval

| Attribute | Value |
|-----------|-------|
| **ID** | TC-12 |
| **Module** | GraphRAG Engine |
| **Description** | Verify both vector and graph context are returned |
| **Precondition** | Papers uploaded, graph and vectors populated |
| **Input** | Question: "What methods are used for sentiment analysis?" |
| **Steps** | 1. Call `HybridRetriever.retrieve(question)` |
| **Expected Result** | Response contains both `vector_chunks` (non-empty) and `graph_context` (non-empty) |
| **Priority** | High |

#### TC-13: Answer Generation with Citations

| Attribute | Value |
|-----------|-------|
| **ID** | TC-13 |
| **Module** | GraphRAG Engine |
| **Description** | Generated answer includes paper citations |
| **Input** | Question with relevant context |
| **Expected Result** | Answer references specific paper titles; citations array is non-empty |
| **Priority** | High |

---

### Module 5 — Multi-Agent System

#### TC-14: Literature Agent

| Attribute | Value |
|-----------|-------|
| **ID** | TC-14 |
| **Module** | Agents |
| **Description** | Literature agent finds related papers |
| **Input** | Topic: "deep learning for NLP" |
| **Expected Result** | Returns list of related papers with relevance explanations |
| **Priority** | Medium |

#### TC-15: Contradiction Agent

| Attribute | Value |
|-----------|-------|
| **ID** | TC-15 |
| **Module** | Agents |
| **Description** | Contradiction agent identifies conflicting findings |
| **Precondition** | Two papers with opposing findings uploaded |
| **Expected Result** | Returns at least one contradiction with paper references |
| **Priority** | Medium |

#### TC-16: Experiment Agent

| Attribute | Value |
|-----------|-------|
| **ID** | TC-16 |
| **Module** | Agents |
| **Description** | Experiment agent suggests novel experiments |
| **Precondition** | Multiple papers uploaded |
| **Expected Result** | Returns experiment suggestions with rationale |
| **Priority** | Medium |

---

### Module 6 — API Layer

#### TC-17: API Health Check

| Attribute | Value |
|-----------|-------|
| **ID** | TC-17 |
| **Module** | API |
| **Description** | Health check endpoint responds correctly |
| **Steps** | 1. Send GET to `/health` |
| **Expected Result** | Status 200, `{"status": "ok"}` |
| **Priority** | High |

#### TC-18: CORS Headers

| Attribute | Value |
|-----------|-------|
| **ID** | TC-18 |
| **Module** | API |
| **Description** | API returns correct CORS headers for frontend |
| **Steps** | 1. Send OPTIONS request from frontend origin |
| **Expected Result** | `Access-Control-Allow-Origin` header present |
| **Priority** | Medium |

---

### Module 7 — Frontend

#### TC-19: Upload UI

| Attribute | Value |
|-----------|-------|
| **ID** | TC-19 |
| **Module** | Frontend |
| **Description** | Upload page renders and accepts PDF |
| **Steps** | 1. Navigate to Upload page 2. Select PDF 3. Click Upload |
| **Expected Result** | Progress shown, success message after completion |
| **Priority** | High |

#### TC-20: Chat UI

| Attribute | Value |
|-----------|-------|
| **ID** | TC-20 |
| **Module** | Frontend |
| **Description** | Chat page displays question and answer |
| **Steps** | 1. Navigate to Chat 2. Type question 3. Press Enter |
| **Expected Result** | User question and AI answer displayed in chat history |
| **Priority** | High |

#### TC-21: Graph Visualization

| Attribute | Value |
|-----------|-------|
| **ID** | TC-21 |
| **Module** | Frontend |
| **Description** | Knowledge graph renders with correct nodes and edges |
| **Precondition** | At least one paper processed |
| **Steps** | 1. Navigate to Graph page |
| **Expected Result** | Interactive graph with color-coded nodes and labeled edges |
| **Priority** | High |

#### TC-22: Persistent Sessions

| Attribute | Value |
|-----------|-------|
| **ID** | TC-22 |
| **Module** | API / DB |
| **Description** | Verify chat sessions persist across reloads |
| **Precondition** | PostgreSQL running |
| **Steps** | 1. Send chat message 2. Reload page 3. Open session |
| **Expected Result** | Previous chat messages load from PostgreSQL |
| **Priority** | High |

#### TC-23: Multi-Paper Comparison (Venn Diagram)

| Attribute | Value |
|-----------|-------|
| **ID** | TC-23 |
| **Module** | Frontend |
| **Description** | Compare two papers for overlapping entities |
| **Steps** | 1. Select two papers 2. Click Compare |
| **Expected Result** | Renders a Venn Diagram showing shared models, methods, etc. |
| **Priority** | Medium |

#### TC-24: Split-View PDF Citations

| Attribute | Value |
|-----------|-------|
| **ID** | TC-24 |
| **Module** | Frontend |
| **Description** | View PDF alongside chat |
| **Steps** | 1. Ask question 2. Click citation chip |
| **Expected Result** | Opens Split-View displaying the source PDF |
| **Priority** | High |

---

## 3. Test Data

### Sample Papers for Testing

| # | Paper Title | Purpose |
|---|------------|---------|
| 1 | "Attention Is All You Need" (Vaswani et al.) | Tests: Transformer, self-attention, NLP, machine translation |
| 2 | "BERT: Pre-training of Deep Bidirectional Transformers" | Tests: BERT model, fine-tuning, NLU tasks |
| 3 | "ResNet: Deep Residual Learning for Image Recognition" | Tests: CNN, computer vision, different domain from papers 1-2 |
| 4 | A paper contradicting or extending one of the above | Tests: Contradiction detection agent |
| 5 | A survey paper covering multiple methods | Tests: Multiple entity extraction, many relationships |

---

## 4. Test Results Summary Template

| TC ID | Description | Status | Notes |
|-------|------------|--------|-------|
| TC-01 | Valid PDF Upload | ⬜ Pending | |
| TC-02 | Invalid File Upload | ⬜ Pending | |
| TC-03 | Text Extraction Quality | ⬜ Pending | |
| TC-04 | Empty PDF Handling | ⬜ Pending | |
| TC-05 | Text Chunking | ⬜ Pending | |
| TC-06 | Embedding Generation | ⬜ Pending | |
| TC-07 | Vector Storage/Retrieval | ⬜ Pending | |
| TC-08 | Neo4j Connection | ⬜ Pending | |
| TC-09 | Node Creation | ⬜ Pending | |
| TC-10 | Relationship Creation | ⬜ Pending | |
| TC-11 | Duplicate Prevention | ⬜ Pending | |
| TC-12 | Hybrid Retrieval | ⬜ Pending | |
| TC-13 | Answer with Citations | ⬜ Pending | |
| TC-14 | Literature Agent | ⬜ Pending | |
| TC-15 | Contradiction Agent | ⬜ Pending | |
| TC-16 | Experiment Agent | ⬜ Pending | |
| TC-17 | API Health Check | ⬜ Pending | |
| TC-18 | CORS Headers | ⬜ Pending | |
| TC-19 | Upload UI | ⬜ Pending | |
| TC-20 | Chat UI | ⬜ Pending | |
| TC-21 | Graph Visualization | ⬜ Pending | |
| TC-22 | Persistent Sessions | ⬜ Pending | |
| TC-23 | Venn Diagram Compare | ⬜ Pending | |
| TC-24 | Split-View Citations | ⬜ Pending | |

**Total Test Cases:** 24  
**Pass Criteria:** All High-priority tests pass; 80%+ of Medium-priority tests pass.
