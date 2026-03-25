import re
import uuid
from collections import defaultdict

from app.services.gemini import get_gemini_client


def _fix_latex_escapes(obj):
    """Recursively clean double-backslash LaTeX in strings: \\\\theta → \\theta"""
    if isinstance(obj, str):
        return re.sub(r'\\\\([a-zA-Z])', r'\\\1', obj)
    if isinstance(obj, dict):
        return {k: _fix_latex_escapes(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_fix_latex_escapes(v) for v in obj]
    return obj

PRE_QUIZ_PROMPT = """\
You are a quiz generator for an adaptive learning system.

Generate {count} EASY multiple-choice questions to check if the student has basic familiarity with this concept BEFORE studying it.

RULES:
1. Questions should be simple concept-recognition level. NOT tricky or deep.
2. Each question has exactly 4 choices. Only one is correct.
3. Wrong choices should be plausible but clearly wrong to someone who knows the basics.
4. Do NOT wrap plain text terms in $...$. Only use $ for actual math formulas (e.g. $\sigma(x)$, $W^T x + b$).
   WRONG: "$ReLU$", "$Gradient Descent$", "$activation functions$"
   CORRECT: "ReLU", "Gradient Descent", "activation functions"

Respond with ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "the correct option text"
    }
  ]
}

--- CONCEPT ---
Title: {title}
Content: {content}
Notation: {notation}
Protected Identifiers: {identifiers}
"""

POST_QUIZ_PROMPT = """\
You are a quiz generator for an adaptive learning system.

Generate exactly {count} quiz questions to reinforce understanding AFTER studying.
Use this exact mix: {mc_count} multiple_choice, {fib_count} fill_in_blank, {km_count} keyword_match.

=== TYPE DEFINITIONS ===

1. "multiple_choice": 4 choices, one correct. Test deeper understanding.
2. "fill_in_blank": A sentence with "___" replacing a key term. Student types the answer.
3. "keyword_match": Student matches terms on the left to definitions on the right.
   - MUST include a "pairs" array with exactly 4 objects.
   - Each object MUST have "left" (term/symbol) and "right" (definition/meaning).
   - Do NOT include "correct_answer" or "options" for this type. Only "pairs".

=== EXAMPLE OUTPUT (for a concept about Derivatives) ===

{
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "What does the derivative f'(x) represent geometrically?",
      "options": [
        "The area under the curve",
        "The slope of the tangent line at point x",
        "The y-intercept of the function",
        "The maximum value of f(x)"
      ],
      "correct_answer": "The slope of the tangent line at point x"
    },
    {
      "type": "fill_in_blank",
      "prompt": "The derivative of x^n follows the ___ rule.",
      "correct_answer": "power"
    },
    {
      "type": "keyword_match",
      "prompt": "Match each term with its meaning.",
      "pairs": [
        {"left": "f'(x)", "right": "First derivative of f"},
        {"left": "dy/dx", "right": "Leibniz notation for derivative"},
        {"left": "f''(x)", "right": "Second derivative of f"},
        {"left": "limit", "right": "Value a function approaches"}
      ]
    }
  ]
}

=== RULES ===
1. Do NOT wrap plain text terms in $...$. Only use $ for actual math formulas.
   WRONG: "$ReLU$", "$MSE$", "$Backpropagation$"
   CORRECT: "ReLU", "MSE", "Backpropagation"
2. For keyword_match: ALWAYS provide exactly 4 pairs in the "pairs" array. No "correct_answer" field.
3. For fill_in_blank: ALWAYS provide "correct_answer".
4. For multiple_choice: "correct_answer" MUST be one of the "options".

Respond with ONLY valid JSON (no markdown fences).

--- CONCEPT ---
Title: {title}
Content: {content}
Notation: {notation}
Protected Identifiers: {identifiers}
"""

# Retry interval for incorrect answers
RETRY_AFTER_N_STEPS = 3


def _normalize_question(q: dict) -> dict | None:
    """Normalize Gemini response. Returns None if invalid."""
    q["id"] = uuid.uuid4().hex[:8]
    qtype = q.get("type", "")

    if qtype == "multiple_choice":
        opts = q.get("options")
        if not opts or not isinstance(opts, list) or len(opts) < 2:
            return None
        if not q.get("correct_answer"):
            return None
        return q

    if qtype == "fill_in_blank":
        if not q.get("correct_answer"):
            return None
        return q

    if qtype == "keyword_match":
        pairs = q.get("pairs")
        if not pairs or not isinstance(pairs, list):
            return None
        # Validate that each pair has left/right
        valid_pairs = []
        for p in pairs:
            if isinstance(p, dict) and p.get("left") and p.get("right"):
                valid_pairs.append({"left": p["left"], "right": p["right"]})
        if len(valid_pairs) < 2:
            return None
        q["pairs"] = valid_pairs
        # keyword_match should not have correct_answer — scoring is pairs-based
        q.pop("correct_answer", None)
        q.pop("options", None)
        return q

    return None  # Unknown type


class QuizGenerator:
    def __init__(self):
        self.client = get_gemini_client()
        self._wrong_queue: dict[str, list[dict]] = defaultdict(list)
        self._step_counter: dict[str, int] = defaultdict(int)
        self._answer_cache: dict[str, list[dict]] = {}

    async def generate_quiz(
        self, node_id: str, title: str, content: str,
        notation: str | None, protected_identifiers: list | None,
        quiz_type: str = "pre",
    ) -> list[dict]:
        """Generate Pre or Post quiz. Includes retry questions for incorrect answers."""
        template = PRE_QUIZ_PROMPT if quiz_type == "pre" else POST_QUIZ_PROMPT

        ids_str = ", ".join(protected_identifiers) if protected_identifiers else "None"
        # Manual substitution instead of .format() — to avoid breaking {} (LaTeX) in content
        prompt = template
        prompt = prompt.replace("{title}", title)
        prompt = prompt.replace("{content}", content[:3000])
        prompt = prompt.replace("{notation}", notation or "None")
        prompt = prompt.replace("{identifiers}", ids_str)
        if quiz_type == "pre":
            prompt = prompt.replace("{count}", "3")
        else:
            prompt = prompt.replace("{count}", "5")
            prompt = prompt.replace("{mc_count}", "2")
            prompt = prompt.replace("{fib_count}", "2")
            prompt = prompt.replace("{km_count}", "1")

        data = await self.client.generate_json(prompt)
        data = _fix_latex_escapes(data)
        raw_questions = data.get("questions", [])

        # Normalization + validation
        questions = []
        for q in raw_questions:
            normalized = _normalize_question(q)
            if normalized:
                questions.append(normalized)

        # Retry incorrect answers
        retry_questions = self._pop_retry_questions(node_id)
        if retry_questions:
            questions = retry_questions + questions

        self._step_counter[node_id] += 1
        self._tick_wrong_queue(node_id)

        # Cache answers
        self._answer_cache[node_id] = questions

        return questions

    def get_cached_questions(self, node_id: str) -> list[dict] | None:
        return self._answer_cache.get(node_id, None)

    def record_wrong_answers(self, node_id: str, wrong_questions: list[dict]):
        for q in wrong_questions:
            self._wrong_queue[node_id].append({
                "question": q,
                "steps_remaining": RETRY_AFTER_N_STEPS,
            })

    def _tick_wrong_queue(self, node_id: str):
        for item in self._wrong_queue.get(node_id, []):
            item["steps_remaining"] -= 1

    def _pop_retry_questions(self, node_id: str) -> list[dict]:
        ready = []
        remaining = []
        for item in self._wrong_queue.get(node_id, []):
            if item["steps_remaining"] <= 0:
                ready.append(item["question"])
            else:
                remaining.append(item)
        self._wrong_queue[node_id] = remaining
        return ready


_generator: QuizGenerator | None = None


def get_quiz_generator() -> QuizGenerator:
    global _generator
    if _generator is None:
        _generator = QuizGenerator()
    return _generator
