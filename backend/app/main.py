import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.notifications import router as notifications_router
from app.api.reports import router as reports_router
from app.api.sim import router as sim_router
from app.api.sites import router as sites_router
from app.api.tickets import router as tickets_router
from app.config import settings
from app.db.session import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are initialized on startup if running with SQLite
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SAURA API",
    description="Sistem Analisis Unjuk Kerja PLTS & Rekomendasi Aksi",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(sites_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(sim_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")


@app.get("/health")
@app.get("/api/v1/health")
def healthcheck():
    return {
        "status": "ok",
        "app": "saura",
        "version": "1.0.0",
        "simulation_mode": settings.SIMULATION_MODE,
    }


# Mount built frontend SPA if available
_frontend_dist = os.path.abspath(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend",
        "dist",
    )
)
if os.path.isdir(_frontend_dist):
    app.mount(
        "/", StaticFiles(directory=_frontend_dist, html=True), name="frontend"
    )
