import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.node import Node
from app.services.gemini import get_gemini_client

router = APIRouter()

_script_cache: dict[str, dict] = {}


async def _generate_script(title: str, content: str) -> dict:
    """Generate audio script via Gemini."""
    client = get_gemini_client()

    prompt = f"""\
You are creating an audio study script in English.

Rules:
- Write a clear explanation (3-5 sentences). Do NOT read formulas — describe them in plain words.
- Create 1 recall question.
- Provide the answer (1 sentence).

Respond with ONLY valid JSON:
{{
  "explanation": "Clear English explanation without any math symbols",
  "question": "A recall question",
  "answer": "The answer"
}}

--- CONCEPT ---
Title: {title}
Content: {content[:2000]}
"""

    try:
        data = await client.generate_json(prompt)
        return {
            "explanation": data.get("explanation", f"{title}에 대해 알아보겠습니다."),
            "question": data.get("question", f"{title}의 핵심을 떠올려 보세요."),
            "answer": data.get("answer", f"정답은 {title}입니다."),
        }
    except Exception:
        clean = re.sub(r"\$\$?[^$]+\$\$?", "", content)
        clean = re.sub(r"\\[a-zA-Z]+", "", clean)
        clean = re.sub(r"[{}^_]", "", clean)
        return {
            "explanation": clean[:300],
            "question": f"{title}의 핵심을 떠올려 보세요.",
            "answer": f"핵심은 {title}입니다.",
        }


@router.get("/nodes/{node_id}/audio-script")
async def get_audio_script(node_id: UUID, db: AsyncSession = Depends(get_db)):
    """Return audio script JSON (for frontend Web Speech API)."""
    cache_key = str(node_id)
    if cache_key in _script_cache:
        return _script_cache[cache_key]

    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    script = await _generate_script(node.title, node.content)
    script["title"] = node.title

    _script_cache[cache_key] = script
    return script
