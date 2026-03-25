from uuid import UUID

from pydantic import BaseModel


class QuizQuestion(BaseModel):
    id: str
    type: str  # 'fill_in_blank' | 'keyword_match' | 'multiple_choice'
    prompt: str
    options: list[str] | None = None
    correct_answer: str | list[str] | None = None
    pairs: list[dict] | None = None  # For keyword_match [{left, right}]


class QuizResponse(BaseModel):
    node_id: UUID
    quiz_type: str  # 'pre' | 'post'
    questions: list[QuizQuestion]


class AnswerSubmission(BaseModel):
    question_id: str
    answer: str


class QuizSubmission(BaseModel):
    answers: list[AnswerSubmission]


class QuizResult(BaseModel):
    node_id: UUID
    score: float
    total: int
    correct: int
    confidence_score: float
    details: list[dict]
