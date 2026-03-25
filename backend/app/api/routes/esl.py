from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.node import Node
from app.services.gemini import get_gemini_client

router = APIRouter()

ESL_PROMPT = """\
You are a bilingual education assistant.

Given the following English study content and a list of Protected Identifiers (technical terms),
produce TWO things:

1. "content_ko": Translate the content to Korean, but keep ALL Protected Identifiers in their original English form exactly where they appear in the text.
2. "identifier_translations": A JSON object mapping each Protected Identifier to a short Korean explanation (2-5 words).

Respond with ONLY valid JSON (no markdown fences):
{{
  "content_ko": "한국어 번역 (Protected Identifiers는 영어 유지)",
  "identifier_translations": {{
    "term1": "한국어 설명",
    "term2": "한국어 설명"
  }}
}}

--- CONTENT ---
{content}

--- PROTECTED IDENTIFIERS ---
{identifiers}
"""


class EslResponse(BaseModel):
    content_ko: str
    identifier_translations: dict[str, str]


# Simple cache
_esl_cache: dict[str, EslResponse] = {}


@router.get("/nodes/{node_id}/esl", response_model=EslResponse)
async def get_esl(node_id: UUID, db: AsyncSession = Depends(get_db)):
    """Return ESL translation (Korean) of node content."""
    cache_key = str(node_id)
    if cache_key in _esl_cache:
        return _esl_cache[cache_key]

    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    identifiers = node.protected_identifiers or []
    client = get_gemini_client()

    prompt = ESL_PROMPT.format(
        content=node.content[:3000],
        identifiers=", ".join(identifiers) if identifiers else "None",
    )

    data = await client.generate_json(prompt)

    response = EslResponse(
        content_ko=data.get("content_ko", node.content),
        identifier_translations=data.get("identifier_translations", {}),
    )

    _esl_cache[cache_key] = response
    return response
