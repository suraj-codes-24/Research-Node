# ResearchNode — Judge Presentation Guide

> Use this guide to explain the project confidently. Keep it simple, speak naturally.

---

## 🎯 One-Line Pitch

> "ResearchNode is a web app that reads research papers, connects the ideas in a knowledge graph, and answers your questions using AI — with proper citations."

---

## 📖 Simple Explanation (2 Minutes)

**The Problem:**
Researchers today read hundreds of papers. Google Scholar can *find* papers, but it can't tell you how Paper A's method relates to Paper B's dataset, or if two papers contradict each other. Everything is disconnected.

**Our Solution:**
ResearchNode does three things:

1. **Upload** — You upload research papers (PDFs). The system extracts text and identifies key things like models, methods, datasets, and tasks.
2. **Connect** — It builds a visual knowledge graph where all these concepts are linked. You can *see* how papers relate to each other.
3. **Ask** — You ask questions in plain English. Instead of just searching text, the system combines graph relationships + text similarity to give you a richer, cited answer. This is called **GraphRAG**.

On top of this, we have **3 AI agents** that automatically:
- Find related literature you might have missed
- Detect contradictions between papers
- Suggest new experiments based on gaps in the graph

We also added **Premium UI Features**:
- **Persistent Sessions:** Powered by PostgreSQL to save chat histories and node notes.
- **Venn Diagram Comparison:** Visually compare shared entities between multiple papers.
- **Split-View PDF:** Click any citation in the chat to instantly open the source PDF side-by-side.

---

## 🔧 How It Works (Technical — Keep Short)

```
PDF Upload
   ↓
Text Extraction (PyMuPDF)
   ↓
Two parallel paths:
   ├── Chunking → Embedding (MiniLM) → Stored in Qdrant (Vector DB)
   └── Entity Extraction (spaCy + LLM) → Stored in Neo4j (Graph DB)
   ↓
User asks a question
   ↓
GraphRAG combines:  Vector Search (similar text) + Graph Traversal (related concepts)
   ↓
LLM generates answer with citations
```

**In one sentence:** *"We split the paper into chunks for text search AND extract entities for graph search, then combine both to answer questions."*

---

## 🧩 Tech Stack (If Asked)

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Python + FastAPI | Fast, modern, auto-generates API docs |
| Vector DB | Qdrant | Free, fast (written in Rust), great for semantic search |
| Graph DB | Neo4j | Industry standard for knowledge graphs, uses Cypher query language |
| Relational DB | PostgreSQL | Saves user chat sessions and node annotations reliably |
| Embeddings | all-MiniLM-L6-v2 | Lightweight (384 dims), free, good quality |
| NLP | spaCy + LangChain | Entity extraction + LLM orchestration |
| LLM | Google Gemini + Ollama | Hybrid approach for API quality and local privacy |
| Frontend | React + Vite + Cytoscape.js | Fast interactive graph visualization with Neon-Glass CSS |

---

## ❓ Expected Questions & Answers

### Q1: What is RAG?
**A:** RAG stands for **Retrieval-Augmented Generation**. Instead of the AI making up answers, we first *retrieve* relevant text from our database, then *augment* the AI's prompt with that context, so it *generates* answers based on actual paper content — not hallucinations.

### Q2: What is GraphRAG? How is it different from normal RAG?
**A:** Normal RAG only does text similarity search — it finds chunks of text that *sound similar* to your question. GraphRAG adds a second layer: it also searches the **knowledge graph** for related concepts and relationships. So if you ask about "BERT for sentiment analysis," normal RAG finds text mentioning those words, but GraphRAG also pulls in that BERT is connected to Transformer, which is connected to other papers — giving richer context.

### Q3: Why two databases? Why not just one?
**A:** They solve different problems:
- **Qdrant (Vector DB)** answers: *"What text is semantically similar to my question?"*
- **Neo4j (Graph DB)** answers: *"What concepts are connected to each other?"*

Combining both gives us the best of both worlds. Text search alone misses relationships. Graph search alone misses nuance in language.

### Q4: What is a Knowledge Graph?
**A:** It's a network of **nodes** (things like papers, models, datasets) connected by **edges** (relationships like "uses," "evaluated on," "compared with"). Think of it like a mind map that the system builds automatically from the papers you upload.

### Q5: How do you extract entities from papers?
**A:** We use a **hybrid approach**:
1. **spaCy NER** — a pre-trained NLP model that identifies names, organizations, products
2. **LLM-based extraction** — we send the text to Gemini with a structured prompt asking it to extract models, methods, datasets, and tasks as JSON

The combination catches more entities than either approach alone.

### Q6: What are the three agents? Why do you need them?
**A:**
- **Literature Agent** — Given a topic, it finds related papers and explains how they connect. Like a smart literature review assistant.
- **Contradiction Agent** — It finds papers that study the same thing but reach different conclusions. Researchers need to know about conflicting results.
- **Experiment Agent** — It looks for *missing edges* in the graph. If Model X has been applied to Dataset A and B, but never to Dataset C, it suggests that as a potential experiment.

They are separate because each requires a different reasoning strategy.

### Q7: What embedding model are you using and why?
**A:** `all-MiniLM-L6-v2` from Sentence Transformers. It generates 384-dimensional vectors. We chose it because:
- It's **free and open-source**
- It's **small** (~80 MB) so it runs fast even without a GPU
- It's **well-tested** for semantic similarity tasks
- For a college project, it gives excellent quality without needing paid APIs

### Q8: How is this different from ChatGPT or Perplexity?
**A:** ChatGPT doesn't have your specific papers. It can hallucinate. It treats each question independently.
ResearchNode:
- Works on **your uploaded papers** specifically
- Builds a **persistent knowledge graph** that grows as you add papers
- Gives **citations** pointing to exact sources
- Detects **contradictions and gaps** across papers — ChatGPT cannot do this

### Q9: What is Cypher? Why Neo4j?
**A:** Cypher is Neo4j's query language for graph databases. It's like SQL but for graphs. Example:
```
MATCH (p:Paper)-[:USES]->(m:Model)
WHERE m.name = "BERT"
RETURN p.title
```
This finds all papers that use BERT. We chose Neo4j because it's the most popular graph database, has great Python support, and Cypher is very readable.

### Q10: What are the limitations of your project?
**A:** *(Always be honest about limitations — judges respect this)*
- Entity extraction isn't 100% accurate — the LLM can miss or misclassify entities
- Works best with well-structured ML/AI papers; may struggle with other domains
- Requires Neo4j and Qdrant to be running locally (not cloud-deployed yet)
- The knowledge graph quality depends on the number of papers uploaded — needs at least 3–5 papers to show meaningful connections
- Currently English-only

### Q11: What is the future scope?
**A:**
- Real-time paper ingestion from arXiv and PubMed APIs
- Multi-user collaborative workspaces
- Fine-tuned domain-specific models for better entity extraction
- Integration with reference managers like Zotero
- Cloud deployment for public access

### Q12: What is cosine similarity?
**A:** It measures how similar two vectors are by calculating the cosine of the angle between them. Score ranges from 0 (completely different) to 1 (identical). We use it to find text chunks whose embeddings are closest to the question's embedding.

### Q13: Why did you add PostgreSQL? Don't you have enough databases?
**A:** Neo4j is for relationships. Qdrant is for semantic search. But we needed a reliable way to store standard relational data — like user chat session history and custom text annotations on graph nodes. PostgreSQL (hosted on Neon) handles this traditional CRUD data perfectly, allowing users to return to their previous research sessions.

---

## 💡 Tips for the Presentation

1. **Start with the problem, not the tech** — "Researchers are drowning in papers..."
2. **Show the demo** — A live working demo beats any slide
3. **Use the graph visual** — The knowledge graph is your most impressive visual element
4. **Admit limitations honestly** — Judges respect self-awareness
5. **Know your tech stack** — Be ready to explain *why* you chose each technology
6. **Don't memorize — understand** — If you understand the flow (PDF → Extract → Embed → Graph → Query → Answer), you can answer any question

---

*Good luck! 🚀*
