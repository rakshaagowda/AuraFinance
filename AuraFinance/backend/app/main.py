from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.db import engine, Base
from app.routers import auth, transactions, ml_analytics, advisor, reports

# Create Database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API with integrated K-Means behavior clustering, Isolation Forest anomaly checks, and linear spend projections.",
    version="1.0.0"
)

# CORS configurations to allow Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins for easy testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(ml_analytics.router, prefix="/api")
app.include_router(advisor.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": str(engine.url.database) if hasattr(engine, 'url') and engine.url else "SQLite"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
