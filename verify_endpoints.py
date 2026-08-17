import json
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def run_tests():
    print("Testing Backend Endpoints...")
    
    routes = [
        route.path for route in app.routes if hasattr(route, 'path')
    ]
    print(f"Discovered Routes: {', '.join(routes)}")
    
    # 1. Health
    res = client.get("/health")
    print(f"GET /health -> {res.status_code}")
    
    # 2. Papers list
    res = client.get("/api/papers")
    print(f"GET /api/papers -> {res.status_code}")
    
    # 3. Query (Empty)
    res = client.post("/api/query", json={"question": ""})
    print(f"POST /api/query (empty) -> {res.status_code}, Body: {res.json()}")
    
    # 4. Graph
    res = client.get("/api/graph")
    print(f"GET /api/graph -> {res.status_code}")
    
    # 5. Agents
    res = client.post("/api/agents/literature", json={"topic": "test"})
    print(f"POST /api/agents/literature -> {res.status_code}")
    
    res = client.post("/api/agents/contradiction")
    print(f"POST /api/agents/contradiction -> {res.status_code}")
    
    res = client.post("/api/agents/experiment")
    print(f"POST /api/agents/experiment -> {res.status_code}")
    
    # 6. Recommendations
    res = client.get("/api/recommendations")
    print(f"GET /api/recommendations -> {res.status_code}")
    
    # 7. Export
    res = client.post("/api/export-report", json={"conversation_history": []})
    print(f"POST /api/export-report (empty) -> {res.status_code}")

if __name__ == "__main__":
    run_tests()
