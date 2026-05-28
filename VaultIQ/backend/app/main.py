from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.database import engine
from app.auth.models import Base
from app.api import auth_router, doc_router, query_router

# Initialize SQLite database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VaultIQ API",
    description="GenAI RAG-based Document Intelligence System backend",
    version="1.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API module routers
app.include_router(auth_router.router)
app.include_router(doc_router.router)
app.include_router(query_router.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "VaultIQ Document Intelligence Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
