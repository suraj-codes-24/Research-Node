# Feasibility Study

## ResearchNode: A GraphRAG Reasoning Engine for Scientific Literature

**Date:** July 2026

---

## 1. Introduction

This document evaluates the feasibility of developing ResearchNode across five dimensions: technical, economic, operational, schedule, and legal. The purpose is to confirm that the project can be successfully completed within the constraints of a college mini project.

---

## 2. Technical Feasibility

### 2.1 Programming Language

| Criterion | Assessment |
|-----------|-----------|
| Language | Python 3.12 |
| Team Familiarity | ✅ High — Python is the primary language taught in curriculum |
| Library Support | ✅ Excellent — all required libraries available via pip |
| AI/ML Ecosystem | ✅ Best-in-class — PyTorch, Transformers, LangChain all Python-native |

### 2.2 Frameworks and Libraries

| Component | Library | Availability | Maturity |
|-----------|---------|-------------|----------|
| Web Backend | FastAPI 0.100+ | ✅ pip install | Production-ready |
| PDF Processing | PyMuPDF 1.24+ | ✅ pip install | Stable, widely used |
| Text Splitting | LangChain 0.2+ | ✅ pip install | Active development |
| Embeddings | sentence-transformers | ✅ pip install | Stable, well-documented |
| NLP/NER | spaCy 3.7+ | ✅ pip install | Production-ready |
| Frontend | React 18+ | ✅ npm install | Industry standard |
| Graph Viz | Cytoscape.js 3.28+ | ✅ npm install | Mature, academic-focused |

### 2.3 Databases

| Database | Type | Installation | Learning Curve |
|----------|------|-------------|---------------|
| Neo4j Community | Graph | ✅ Desktop installer available | Medium — Cypher is intuitive |
| Qdrant | Vector | ✅ Docker or standalone binary | Low — simple REST API |

### 2.4 LLM Access

| Option | Cost | Setup Complexity | Quality |
|--------|------|-----------------|---------|
| Google Gemini API (free tier) | Free (rate limited) | Low | High |
| Ollama (local LLM) | Free | Medium (requires GPU) | Medium-High |
| OpenAI API | Paid (~$0.01/query) | Low | Very High |
| Groq API (free tier) | Free (rate limited) | Low | High |

> [!TIP]
> For a mini project demo, **Google Gemini free tier** or **Ollama with Llama 3** provides sufficient quality at zero cost.

### 2.5 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 |
| RAM | 8 GB | 16 GB |
| Storage | 10 GB free | 20 GB free |
| GPU | Not required (CPU embedding) | NVIDIA GPU (faster embedding) |
| OS | Windows 10/11, Ubuntu 20.04+ | Any modern OS |

### 2.6 Technical Feasibility Verdict

> ✅ **FEASIBLE** — All required technologies are mature, free/open-source, well-documented, and compatible with standard development hardware.

---

## 3. Economic Feasibility

### 3.1 Development Cost

| Item | Cost |
|------|------|
| Python | Free (open-source) |
| FastAPI | Free (MIT license) |
| React | Free (MIT license) |
| Neo4j Community Edition | Free |
| Qdrant (self-hosted) | Free (Apache 2.0) |
| sentence-transformers | Free (Apache 2.0) |
| spaCy | Free (MIT license) |
| PyMuPDF | Free (AGPL / commercial) |
| LangChain | Free (MIT license) |
| Cytoscape.js | Free (MIT license) |
| VS Code | Free |
| Git | Free |
| LLM API (Gemini free tier) | Free |

### 3.2 Infrastructure Cost

| Item | Cost |
|------|------|
| Development machine | Already available (student laptop) |
| Cloud hosting | Not required (local development for demo) |
| Domain name | Not required |
| SSL certificate | Not required |

### 3.3 Total Cost

| Category | Amount |
|----------|--------|
| Software licenses | ₹0 |
| Hardware | ₹0 (existing) |
| Cloud services | ₹0 |
| LLM API | ₹0 (free tier) |
| **Total** | **₹0** |

### 3.4 Economic Feasibility Verdict

> ✅ **FEASIBLE** — The entire project can be developed at zero cost using open-source tools and free-tier services.

---

## 4. Operational Feasibility

### 4.1 User Acceptance

| Factor | Assessment |
|--------|-----------|
| Target users understand PDF upload | ✅ Familiar interaction |
| Target users can type questions | ✅ Chat-based interface is intuitive |
| Graph visualization adds value | ✅ Visual learners benefit greatly |
| No training required | ✅ Self-explanatory UI |

### 4.2 Deployment

| Factor | Assessment |
|--------|-----------|
| Can run on student laptop | ✅ Yes |
| Can demonstrate in 10-15 minutes | ✅ Yes — upload paper, ask question, show graph |
| Requires internet | ⚠️ Only for LLM API (can use Ollama offline) |
| Database setup | ⚠️ Neo4j and Qdrant need to be running |

### 4.3 Maintenance

| Factor | Assessment |
|--------|-----------|
| No ongoing server costs | ✅ Local deployment |
| No user management needed | ✅ Single-user system |
| Data persists in Neo4j/Qdrant | ✅ Survives restarts |

### 4.4 Operational Feasibility Verdict

> ✅ **FEASIBLE** — The system is straightforward to use, demonstrate, and maintain.

---

## 5. Schedule Feasibility

### 5.1 Development Timeline

| Week | Tasks | Risk Level |
|------|-------|-----------|
| Week 1 | Environment setup, PDF upload/extraction | 🟢 Low |
| Week 2 | Chunking, embeddings, Qdrant integration | 🟢 Low |
| Week 3 | Neo4j graph, entity extraction | 🟡 Medium |
| Week 4 | RAG chatbot, React UI | 🟡 Medium |
| Week 5 | Multi-agent system, gap detection | 🟡 Medium |
| Week 6 | Testing, documentation, presentation | 🟢 Low |

### 5.2 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| LLM API rate limits | Medium | Medium | Use Ollama as fallback |
| Neo4j learning curve | Medium | Low | Extensive documentation available |
| Entity extraction quality | Medium | Medium | Start with simple patterns, improve iteratively |
| Time overrun | Low | Medium | MVP-first approach ensures core features are completed |

### 5.3 Schedule Feasibility Verdict

> ✅ **FEASIBLE** — The 6-week timeline is realistic with an MVP-first approach that ensures core deliverables are completed even if advanced features are deferred.

---

## 6. Legal Feasibility

### 6.1 Software Licenses

| Software | License | Commercial Use | Modification |
|----------|---------|---------------|-------------|
| Python | PSF License | ✅ | ✅ |
| FastAPI | MIT | ✅ | ✅ |
| React | MIT | ✅ | ✅ |
| Neo4j Community | GPL v3 | ✅ (with conditions) | ✅ |
| Qdrant | Apache 2.0 | ✅ | ✅ |
| LangChain | MIT | ✅ | ✅ |
| sentence-transformers | Apache 2.0 | ✅ | ✅ |
| spaCy | MIT | ✅ | ✅ |
| PyMuPDF | AGPL v3 | ⚠️ (AGPL requires source disclosure) | ✅ |
| Cytoscape.js | MIT | ✅ | ✅ |

### 6.2 Data and Privacy

- Users upload their own papers — no third-party data collection
- No personal data is stored beyond paper metadata
- System runs locally — no data leaves the user's machine (except LLM API calls)

### 6.3 Legal Feasibility Verdict

> ✅ **FEASIBLE** — All components use permissive open-source licenses suitable for an academic project.

---

## 7. Overall Feasibility Conclusion

| Dimension | Status | Summary |
|-----------|--------|---------|
| Technical | ✅ Feasible | All technologies are mature and available |
| Economic | ✅ Feasible | Zero cost with open-source tools |
| Operational | ✅ Feasible | Easy to use and demonstrate |
| Schedule | ✅ Feasible | 6-week timeline is realistic |
| Legal | ✅ Feasible | All licenses are permissive |

> [!IMPORTANT]
> **The project is feasible on all dimensions and is approved to proceed to the implementation phase.**
