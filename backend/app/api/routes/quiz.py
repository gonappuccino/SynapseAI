from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.node import Node
from app.schemas.quiz import QuizQuestion, QuizResponse, QuizResult, QuizSubmission
from app.services.quiz_generator import get_quiz_generator

router = APIRouter()


async def _get_node(node_id: UUID, db: AsyncSession) -> Node:
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.get("/nodes/{node_id}/quiz", response_model=QuizResponse)
async def get_quiz(
    node_id: UUID,
    type: str = "pre",
    db: AsyncSession = Depends(get_db),
):
    """Generate Pre or Post quiz."""
    if type not in ("pre", "post"):
        raise HTTPException(status_code=400, detail="type must be 'pre' or 'post'")

    node = await _get_node(node_id, db)
    generator = get_quiz_generator()

    questions = await generator.generate_quiz(
        node_id=str(node.id),
        title=node.title,
        content=node.content,
        notation=node.notation,
        protected_identifiers=node.protected_identifiers,
        quiz_type=type,
    )

    return QuizResponse(
        node_id=node.id,
        quiz_type=type,
        questions=[QuizQuestion(**q) for q in questions],
    )


@router.post("/nodes/{node_id}/quiz", response_model=QuizResult)
async def submit_quiz(
    node_id: UUID,
    submission: QuizSubmission,
    type: str = "post",
    db: AsyncSession = Depends(get_db),
):
    """Grade quiz + update confidence_score + record wrong answers."""
    node = await _get_node(node_id, db)
    generator = get_quiz_generator()

    # Retrieve cached answers from GET — regenerate if not found
    questions = generator.get_cached_questions(str(node.id))
    if not questions:
        questions = await generator.generate_quiz(
            node_id=str(node.id),
            title=node.title,
            content=node.content,
            notation=node.notation,
            protected_identifiers=node.protected_identifiers,
            quiz_type=type,
        )

    # Answer mapping: question_id → correct_answer
    answer_map: dict[str, str | list] = {}
    question_map: dict[str, dict] = {}
    for q in questions:
        answer_map[q["id"]] = q.get("correct_answer", "")
        question_map[q["id"]] = q

    # Grading
    details = []
    correct_count = 0
    wrong_questions = []

    for ans in submission.answers:
        expected = answer_map.get(ans.question_id)
        if expected is None:
            continue

        is_correct = _check_answer(ans.answer, expected)
        if is_correct:
            correct_count += 1
        else:
            wrong_questions.append(question_map.get(ans.question_id, {}))

        details.append({
            "question_id": ans.question_id,
            "submitted": ans.answer,
            "correct_answer": expected,
            "is_correct": is_correct,
        })

    total = len(submission.answers)
    score = correct_count / total if total > 0 else 0.0

    # Update confidence_score
    # Post-quiz has higher weight (0.8) since it's after study; pre-quiz is reference only (0.2)
    old_confidence = node.confidence_score or 0.0
    if type == "post":
        new_confidence = old_confidence * 0.2 + score * 100 * 0.8
    else:
        new_confidence = score * 100  # pre-quiz is applied as-is
    node.confidence_score = min(100.0, new_confidence)
    await db.commit()

    # Record to wrong answer queue
    if wrong_questions:
        generator.record_wrong_answers(str(node.id), wrong_questions)

    return QuizResult(
        node_id=node.id,
        score=score,
        total=total,
        correct=correct_count,
        confidence_score=node.confidence_score,
        details=details,
    )


def _normalize(text: str) -> str:
    """Normalize for comparison: lowercase, remove spaces/punctuation."""
    import re
    return re.sub(r"[^a-z0-9가-힣]", "", text.strip().lower())


def _check_answer(submitted: str, expected: str | list) -> bool:
    """Compare answers. Flexible matching: correct if it contains the key part of the answer."""
    sub = _normalize(submitted)
    if not sub:
        return False

    targets = [expected] if isinstance(expected, str) else expected

    for t in targets:
        exp = _normalize(t)
        # Exact match
        if sub == exp:
            return True
        # One contains the other (co-op ⊂ software(co-op))
        if sub in exp or exp in sub:
            return True

    return False
