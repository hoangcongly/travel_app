from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.domains.spatial.router import router as spatial_router
from app.domains.culture.router import router as culture_router
from app.domains.inventory.router import router as inventory_router
from app.domains.vision.router import router as vision_router
from app.domains.agent.router import router as agent_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS an toàn: lấy từ config (không hardcode "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "AEGIS System is running", "version": settings.VERSION}

app.include_router(spatial_router, prefix="/api/v1/spatial", tags=["Spatial & Maps"])
app.include_router(culture_router, prefix="/api/v1/culture", tags=["Culture & Storytelling"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["Inventory & Locking"])
app.include_router(vision_router, prefix="/api/v1/vision", tags=["Vision & AI Matching"])
app.include_router(agent_router, prefix="/api/v1/agent", tags=["Agent & AI Orchestrator"])