from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="SynapseAI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.routes.upload import router as upload_router
from app.api.routes.graph import router as graph_router
from app.api.routes.quiz import router as quiz_router
from app.api.routes.audio import router as audio_router
from app.api.routes.esl import router as esl_router
from app.api.routes.images import router as images_router

app.include_router(upload_router, tags=["upload"])
app.include_router(graph_router, tags=["graph"])
app.include_router(quiz_router, tags=["quiz"])
app.include_router(audio_router, tags=["audio"])
app.include_router(esl_router, tags=["esl"])
app.include_router(images_router, tags=["images"])


@app.get("/health")
async def health():
    return {"status": "ok"}
