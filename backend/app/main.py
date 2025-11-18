from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import auth, boards
from app.db.database import engine, Base

# ---------------------------------------------------
# Create FastAPI app FIRST
# ---------------------------------------------------
app = FastAPI(title="Branches API")

# ---------------------------------------------------
# Include routers
# ---------------------------------------------------
app.include_router(auth.router)      # /auth/login, /auth/me etc.
app.include_router(boards.router)    # /boards and /boards/.../columns

# ---------------------------------------------------
# Database startup
# ---------------------------------------------------
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    logger.info("DB tables ensured")

# ---------------------------------------------------
# CORS
# ---------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# Health check
# ---------------------------------------------------
@app.get("/health")
def health():
    logger.info("Health check hit")
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Branches API running", "try": "/health"}
