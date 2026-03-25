from uuid import UUID

from pydantic import BaseModel


class NodeOut(BaseModel):
    id: UUID
    session_id: str
    title: str
    content: str
    notation: str | None = None
    protected_identifiers: list[str] | None = None
    confidence_score: float = 0.0

    model_config = {"from_attributes": True}


class EdgeOut(BaseModel):
    id: UUID
    source_id: UUID
    target_id: UUID
    relation_type: str

    model_config = {"from_attributes": True}


class GraphOut(BaseModel):
    session_id: str
    nodes: list[NodeOut]
    edges: list[EdgeOut]
