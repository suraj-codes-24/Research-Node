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
                auth=(self.user, self.password),
                connection_timeout=2.0
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

    def compare_papers(self, paper_ids: list[str]):
        """
        Compare multiple papers to find shared and distinct entities.
        """
        if not paper_ids or len(paper_ids) < 2:
            return {"shared": [], "distinct": {}}
            
        # Get shared entities
        shared_query = """
        MATCH (p:Paper)-[]-(e)
        WHERE p.id IN $paper_ids AND NOT e:Paper
        WITH e, count(DISTINCT p) as paper_count
        WHERE paper_count = size($paper_ids)
        RETURN labels(e)[0] as label, e.name as name
        """
        shared_results = self.query(shared_query, {"paper_ids": paper_ids})
        shared = [{"label": r["label"], "name": r["name"]} for r in shared_results]
        
        # Get distinct entities per paper
        distinct = {pid: [] for pid in paper_ids}
        
        for pid in paper_ids:
            distinct_query = """
            MATCH (p:Paper {id: $pid})-[]-(e)
            WHERE NOT e:Paper
            AND NOT EXISTS {
                MATCH (other:Paper)-[]-(e)
                WHERE other.id IN $other_pids
            }
            RETURN labels(e)[0] as label, e.name as name
            """
            other_pids = [p for p in paper_ids if p != pid]
            dist_results = self.query(distinct_query, {"pid": pid, "other_pids": other_pids})
            distinct[pid] = [{"label": r["label"], "name": r["name"]} for r in dist_results]
            
        return {
            "shared": shared,
            "distinct": distinct
        }

    def create_paper_node(self, paper_id: str, title: str, filename: str, session_id: str = ""):
        """
        Creates or updates a Paper node in the graph.
        """
            
        query = """
        MERGE (p:Paper {id: $paper_id, session_id: $session_id})
        ON CREATE SET p.title = $title, p.filename = $filename
        ON MATCH SET p.title = $title, p.filename = $filename
        RETURN p
        """
        self.query(query, {"paper_id": paper_id, "title": title, "filename": filename, "session_id": session_id})

    def create_entity_node(self, label: str, name: str, properties: dict = None, session_id: str = ""):
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
        MERGE (e:{label} {{name: $name, session_id: $session_id}})
        """
        
        # Add dynamic properties if they exist
        if properties:
            set_clauses = [f"e.{k} = ${k}" for k in properties]
            query += f"ON CREATE SET {', '.join(set_clauses)} "
            query += f"ON MATCH SET {', '.join(set_clauses)} "
            
        query += "RETURN e"
        
        params = {"name": name.lower(), "session_id": session_id}
        if properties:
            params.update(properties)
            
        self.query(query, params)

    def create_relationship(self, from_label: str, from_prop: str, from_val: str, 
                          rel_type: str, 
                          to_label: str, to_prop: str, to_val: str,
                          session_id: str = ""):
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
        MATCH (a:{from_label} {{{from_prop}: $from_val, session_id: $session_id}})
        MATCH (b:{to_label} {{{to_prop}: $to_val, session_id: $session_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        RETURN r
        """
        
        self.query(query, {
            "from_val": from_val if from_prop == "id" else from_val.lower(),
            "to_val": to_val if to_prop == "id" else to_val.lower(),
            "session_id": session_id
        })

    def get_full_graph(self, session_id: str = None):
        """Returns nodes and edges for Cytoscape.js frontend."""
            
        if session_id:
            nodes_query = "MATCH (n {session_id: $session_id}) RETURN id(n) as id, labels(n)[0] as label, properties(n) as props"
            edges_query = "MATCH (a {session_id: $session_id})-[r]->(b {session_id: $session_id}) RETURN id(a) as source, id(b) as target, type(r) as label"
            nodes_result = self.query(nodes_query, {"session_id": session_id})
            edges_result = self.query(edges_query, {"session_id": session_id})
        else:
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
        
        
        # A more complex parser would be needed here to return proper Cytoscape format
        # For MVP, we'll return a simpler set of connected entities
        nodes_query = """
        MATCH (p:Paper {id: $paper_id})-[r]-(e)
        RETURN labels(e)[0] as label, properties(e) as props, type(r) as rel
        """
        
        return self.query(nodes_query, {"paper_id": paper_id})

    def get_graph_context_for_rag(self, paper_titles: list[str], session_id: str = None) -> str:
        """
        Given a list of paper titles retrieved from Vector Search, 
        fetches their related entities from the Knowledge Graph to provide enriched context.
        """
        if not paper_titles:
            return ""
            
        query = """
        MATCH (p:Paper)-[r]->(e)
        WHERE p.title IN $titles
        """
        if session_id:
            query += " AND p.session_id = $session_id AND e.session_id = $session_id "
        
        query += """
        RETURN p.title AS paper, type(r) AS rel, labels(e)[0] AS type, e.name AS entity
        """
        
        results = self.query(query, {"titles": paper_titles, "session_id": session_id})
        
        if not results:
            return "No additional graph context found."
            
        context_parts = []
        for row in results:
            context_parts.append(f"Paper '{row['paper']}' {row['rel']} {row['type']} '{row['entity']}'.")
            
        return "\n".join(set(context_parts))

    def get_targeted_graph_context(self, entities: list[str], session_id: str = None) -> str:
        """
        Retrieves highly relevant relationships from the graph based on exact or partial matches
        to the provided entity names.
        """
        if not entities:
            return ""
            
        query = """
        UNWIND $entities AS e
        MATCH (n)-[r]->(m)
        WHERE toLower(n.name) CONTAINS toLower(e) OR toLower(m.name) CONTAINS toLower(e)
        """
        if session_id:
            query += " AND n.session_id = $session_id AND m.session_id = $session_id "
            
        query += """
        RETURN DISTINCT labels(n)[0] AS n_label, n.name AS n_name, 
               type(r) AS rel, 
               labels(m)[0] AS m_label, m.name AS m_name
        LIMIT 50
        """
        
        # Filter out common/short words to prevent massive query returns
        clean_entities = [e for e in entities if len(e) > 3]
        if not clean_entities:
            return ""
            
        results = self.query(query, {"entities": clean_entities, "session_id": session_id})
        
        if not results:
            return "No targeted graph context found."
            
        context_parts = []
        for row in results:
            context_parts.append(f"({row['n_label']} '{row['n_name']}') -[{row['rel']}]-> ({row['m_label']} '{row['m_name']}')")
            
        return "\n".join(set(context_parts))

    def delete_paper(self, paper_id: str):
        """
        Deletes a paper node and all its relationships.
        Also deletes any orphaned entities (Models, Methods, etc.) that no longer have any relationships.
        """
        try:
            # 1. Delete the paper node and its direct relationships
            self.query("MATCH (p:Paper {id: $paper_id}) DETACH DELETE p", {"paper_id": paper_id})
            
            # 2. Delete orphaned entities (nodes with no path to ANY paper)
            self.query("""
            MATCH (e) 
            WHERE NOT (e:Paper) AND NOT (e)-[*1..5]-(:Paper)
            DETACH DELETE e
            """)
        except Exception as e:
            print(f"Failed to delete paper {paper_id} from Neo4j: {e}")

# Singleton instance
_neo4j_instance = None

def get_neo4j_service() -> Neo4jService:
    global _neo4j_instance
    if _neo4j_instance is None:
        _neo4j_instance = Neo4jService()
    return _neo4j_instance
