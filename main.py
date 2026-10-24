"""
CANON / FIDELIS - Cloud Deployment Entrypoint (Render / Cloud Web Services)
Allows starting the FastAPI backend directly from repository root or subfolder.
"""
import sys
import os
from pathlib import Path

# Ensure backend folder is in Python module search path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import the core FastAPI instance
from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port)
