import subprocess
import sys
import os
import time

def start_servers():
    print("="*50)
    print("Starting ResearchNode Project")
    print("="*50)
    
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    
    # Python executable from virtual environment
    venv_python = os.path.join(base_dir, "researchnode-env", "Scripts", "python.exe")
    
    if not os.path.exists(venv_python):
        print(f"Error: Virtual environment not found at {venv_python}")
        print("Please ensure you have created the 'researchnode-env' virtual environment.")
        sys.exit(1)

    print("1. Launching FastAPI Backend in a new window...")
    # Using CREATE_NEW_CONSOLE to open a separate terminal window for the backend logs
    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"],
        cwd=base_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    
    # Wait for the backend to become healthy before starting the frontend
    import urllib.request
    from urllib.error import URLError
    
    print("Waiting for backend to start up (this may take 30-40 seconds for models to load)...")
    backend_url = "http://localhost:8000/health"
    start_time = time.time()
    backend_ready = False
    
    while time.time() - start_time < 90:
        try:
            response = urllib.request.urlopen(backend_url)
            if response.getcode() == 200:
                backend_ready = True
                print("Backend is ready!")
                break
        except URLError:
            time.sleep(2)
            
    if not backend_ready:
        print("Warning: Backend didn't start in time. Starting frontend anyway...")

    print("2. Launching React Frontend in a new window...")
    # Using npm.cmd for Windows
    frontend_process = subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=frontend_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    # Start Ollama
    print("3. Launching Ollama in a new window...")
    subprocess.Popen(
        ["ollama", "serve"],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    # Start Neo4j Desktop (GUI)
    neo4j_path = r"C:\Program Files\Neo4j Desktop 2\Neo4j Desktop 2.exe"
    if os.path.exists(neo4j_path):
        print("4. Launching Neo4j Desktop GUI...")
        subprocess.Popen([neo4j_path])
    else:
        print("4. Note: Neo4j Desktop not found at standard path. Please start it manually.")

    print("\nServers are starting up in separate windows!")
    print("   - Backend API: http://localhost:8000")
    print("   - Frontend UI: http://localhost:5173")
    print("   - Ollama LLM:  http://localhost:11434")
    print("\nNote: Please click 'Start' in the Neo4j Desktop app to start your database!")
    print("\n(You can close this launcher window now. To stop the servers later, simply close their command prompt windows).")
    
    try:
        # Keep the launcher alive so the user can read the output,
        # but closing it won't kill the child windows because of CREATE_NEW_CONSOLE.
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nExiting launcher...")

if __name__ == "__main__":
    start_servers()
