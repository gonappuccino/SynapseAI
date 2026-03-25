"""Demo seed data — run after docker compose up: python seed.py"""
import asyncio
import uuid

from sqlalchemy import text
from app.db.session import engine, async_session
from app.models.node import Base, Node
from app.models.edge import Edge

SESSION_ID = "demo_session_001"

NODES = [
    {
        "title": "Linear Algebra Basics",
        "content": "Linear algebra is the branch of mathematics concerning linear equations, linear maps, and their representations in vector spaces and through matrices.",
        "notation": "$\\mathbf{Ax} = \\mathbf{b}$",
        "protected_identifiers": ["$\\mathbf{A}$", "$\\mathbf{x}$", "$\\mathbf{b}$", "matrix", "vector space"],
        "confidence_score": 0.0,
    },
    {
        "title": "Matrix Multiplication",
        "content": "Matrix multiplication is a binary operation that produces a matrix from two matrices. The number of columns in the first matrix must equal the number of rows in the second matrix.",
        "notation": "$C = AB$ where $C_{ij} = \\sum_k A_{ik} B_{kj}$",
        "protected_identifiers": ["$C_{ij}$", "$A_{ik}$", "$B_{kj}$", "matrix multiplication"],
        "confidence_score": 0.0,
    },
    {
        "title": "Determinant",
        "content": "The determinant is a scalar value that can be computed from the elements of a square matrix and encodes certain properties of the linear transformation.",
        "notation": "$\\det(A) = |A|$",
        "protected_identifiers": ["$\\det(A)$", "determinant", "square matrix"],
        "confidence_score": 0.0,
    },
    {
        "title": "Eigenvalues and Eigenvectors",
        "content": "An eigenvector of a linear transformation is a nonzero vector that changes at most by a scalar factor when that transformation is applied. The corresponding scalar is called an eigenvalue.",
        "notation": "$A\\mathbf{v} = \\lambda\\mathbf{v}$",
        "protected_identifiers": ["$\\lambda$", "eigenvector", "eigenvalue", "$A\\mathbf{v} = \\lambda\\mathbf{v}$"],
        "confidence_score": 0.0,
    },
    {
        "title": "Characteristic Polynomial",
        "content": "The characteristic polynomial of a square matrix is a polynomial which is invariant under matrix similarity and has the eigenvalues as roots.",
        "notation": "$\\det(A - \\lambda I) = 0$",
        "protected_identifiers": ["$\\det(A - \\lambda I)$", "characteristic polynomial", "$\\lambda$"],
        "confidence_score": 0.0,
    },
]

# source_title -> target_title (prerequisite: source must be learned before target)
EDGES = [
    ("Linear Algebra Basics", "Matrix Multiplication", "prerequisite"),
    ("Matrix Multiplication", "Determinant", "prerequisite"),
    ("Determinant", "Eigenvalues and Eigenvectors", "prerequisite"),
    ("Eigenvalues and Eigenvectors", "Characteristic Polynomial", "sub_concept"),
]


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Delete existing demo data
        await db.execute(text("DELETE FROM edges WHERE session_id = :sid"), {"sid": SESSION_ID})
        await db.execute(text("DELETE FROM nodes WHERE session_id = :sid"), {"sid": SESSION_ID})

        title_to_id: dict[str, uuid.UUID] = {}

        for nd in NODES:
            node_id = uuid.uuid4()
            title_to_id[nd["title"]] = node_id
            db.add(Node(
                id=node_id,
                session_id=SESSION_ID,
                title=nd["title"],
                content=nd["content"],
                notation=nd["notation"],
                protected_identifiers=nd["protected_identifiers"],
                confidence_score=nd["confidence_score"],
            ))

        for src, tgt, rel in EDGES:
            db.add(Edge(
                session_id=SESSION_ID,
                source_id=title_to_id[src],
                target_id=title_to_id[tgt],
                relation_type=rel,
            ))

        await db.commit()

    print(f"Seeded {len(NODES)} nodes, {len(EDGES)} edges for session: {SESSION_ID}")
    print(f"Open: http://localhost:3000/learn/{SESSION_ID}")


if __name__ == "__main__":
    asyncio.run(seed())
