from neo4j import GraphDatabase

from backend.config import settings


class Neo4jService:
    """
    Manages connections and queries to the Neo4j Knowledge Graph.
    Uses MERGE to prevent duplicate nodes and relationships.
    """
    
    def __init__(self):
        self.uri = settings.neo4j_uri
        self.user = settings.neo4j_user
        self.password = settings.neo4j_password
        self.driver = None
        self._connect()

    def _connect(self):
        try:
            self.driver = GraphDatabase.driver(
                self.uri, 
                auth=(self.user, self.password)
            )
            # Verify connectivity
            self.driver.verify_connectivity()
            print("Successfully connected to Neo4j.")
        except Exception as e:
            print(f"Warning: Failed to connect to Neo4j at {self.uri}. Is it running? Error: {e}")
            self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, query: str, parameters: dict = None):
        """Execute a custom Cypher query."""
        if not self.driver:
            self._connect()
        if not self.driver:
            return []
            
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    def create_paper_node(self, paper_id: str, title: str, filename: str):
        """
        Creates or updates a Paper node in the graph.
        """
            
        query = """
        MERGE (p:Paper {id: $paper_id})
        ON CREATE SET p.title = $title, p.filename = $filename
        ON MATCH SET p.title = $title, p.filename = $filename
        RETURN p
        """
        self.query(query, {"paper_id": paper_id, "title": title, "filename": filename})

    def create_entity_node(self, label: str, name: str, properties: dict = None):
        """
        Creates or updates an entity node (Model, Method, Dataset, Task, Author).
        Entity name is always lowercase to prevent duplicates (e.g. 'transformer' vs 'Transformer').
        """
            
        # Ensure label is safe (prevent Cypher injection)
        valid_labels = {"Model", "Method", "Dataset", "Task", "Author", "Entity"}
        if label not in valid_labels:
            label = "Entity"

        # Dynamically build the MERGE statement. Neo4j driver does not support 
        # parameterizing labels, so we format it safely.
        query = f"""
        MERGE (e:{label} {{name: $name}})
        """
        
        # Add dynamic properties if they exist
        if properties:
            set_clauses = [f"e.{k} = ${k}" for k in properties]
            query += f"ON CREATE SET {', '.join(set_clauses)} "
            query += f"ON MATCH SET {', '.join(set_clauses)} "
            
        query += "RETURN e"
        
        params = {"name": name.lower()}
        if properties:
            params.update(properties)
            
        self.query(query, params)

    def create_relationship(self, from_label: str, from_prop: str, from_val: str, 
                          rel_type: str, 
                          to_label: str, to_prop: str, to_val: str):
        """
        Creates a relationship between two nodes.
        e.g., (Paper {id: '123'}) -[:USES]-> (Model {name: 'bert'})
        """
            
        valid_rels = {"USES", "EVALUATED_ON", "APPLIED_TO", "CITES", "AUTHORED_BY", "COMPARED_WITH", "IMPROVES_ON", "MENTIONS"}
        if rel_type not in valid_rels:
            rel_type = "MENTIONS"

        # Sanitize labels (can't parameterize labels)
        valid_labels = {"Paper", "Model", "Method", "Dataset", "Task", "Author", "Entity"}
        from_label = from_label if from_label in valid_labels else "Entity"
        to_label = to_label if to_label in valid_labels else "Entity"

        query = f"""
        MATCH (a:{from_label} {{{from_prop}: $from_val}})
        MATCH (b:{to_label} {{{to_prop}: $to_val}})
        MERGE (a)-[r:{rel_type}]->(b)
        RETURN r
        """
        
        self.query(query, {
            "from_val": from_val if from_prop == "id" else from_val.lower(),
            "to_val": to_val if to_prop == "id" else to_val.lower()
        })

    def get_full_graph(self):
        """Returns nodes and edges for Cytoscape.js frontend."""
            
        # Get all nodes
        nodes_query = "MATCH (n) RETURN id(n) as id, labels(n)[0] as label, properties(n) as props"
        nodes_result = self.query(nodes_query)
        
        # Get all relationships
        edges_query = "MATCH (a)-[r]->(b) RETURN id(a) as source, id(b) as target, type(r) as label"
        edges_result = self.query(edges_query)
        
        return {
            "nodes": nodes_result,
            "edges": edges_result
        }

    def get_paper_subgraph(self, paper_id: str):
        """Returns nodes and edges within 1-2 hops of a specific paper."""
            
        # This gets the paper, the entities it connects to, and relationships between them
        query = """
        MATCH path = (p:Paper {id: $paper_id})-[*1..2]-(connected)
        RETURN path
        """
        
        # A more complex parser would be needed here to return proper Cytoscape format
        # For MVP, we'll return a simpler set of connected entities
        nodes_query = """
        MATCH (p:Paper {id: $paper_id})-[r]-(e)
        RETURN labels(e)[0] as label, properties(e) as props, type(r) as rel
        """
        
        return self.query(nodes_query, {"paper_id": paper_id})

    def get_graph_context_for_rag(self, paper_titles: list[str]) -> str:
        """
        Given a list of paper titles retrieved from Vector Search, 
        fetches their related entities from the Knowledge Graph to provide enriched context.
        """
        if not paper_titles:
            return ""
            
        query = """
        MATCH (p:Paper)-[r]->(e)
        WHERE p.title IN $titles
        RETURN p.title AS paper, type(r) AS rel, labels(e)[0] AS type, e.name AS entity
        """
        
        results = self.query(query, {"titles": paper_titles})
        
        if not results:
            return "No additional graph context found."
            
        context_parts = []
        for row in results:
            context_parts.append(f"Paper '{row['paper']}' {row['rel']} {row['type']} '{row['entity']}'.")
            
        return "\n".join(set(context_parts))

# Singleton instance
_neo4j_instance = None

def get_neo4j_service() -> Neo4jService:
    global _neo4j_instance
    if _neo4j_instance is None:
        _neo4j_instance = Neo4jService()
    return _neo4j_instance
