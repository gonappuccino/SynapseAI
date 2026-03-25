from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.edge import Edge
from app.models.node import Node
from app.schemas.graph import EdgeOut, GraphOut, NodeOut

router = APIRouter()


@router.get("/sessions/{session_id}/graph", response_model=GraphOut)
async def get_graph(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the knowledge graph (nodes + edges) for a session."""
    nodes_result = await db.execute(
        select(Node).where(Node.session_id == session_id).limit(20)
    )
    nodes = nodes_result.scalars().all()

    if not nodes:
        raise HTTPException(status_code=404, detail="Session not found")

    edges_result = await db.execute(
        select(Edge).where(Edge.session_id == session_id)
    )
    edges = edges_result.scalars().all()

    return GraphOut(
        session_id=session_id,
        nodes=[NodeOut.model_validate(n) for n in nodes],
        edges=[EdgeOut.model_validate(e) for e in edges],
    )
