import asyncio
import base64
import json
import re

from google import genai
from google.genai import types

from app.core.config import get_settings


class GeminiClient:
    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"

    async def generate(self, prompt: str) -> str:
        """Call Gemini API. Retry up to 3 times on 429 (exponential backoff)."""
        for attempt in range(4):
            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and attempt < 3:
                    await asyncio.sleep((attempt + 1) * 4)
                    continue
                raise

    async def generate_structured(
        self, prompt: str, schema: dict, images: list[dict] | None = None,
    ) -> dict:
        """Gemini structured output — JSON Schema + multimodal image support."""
        # Build contents: text + images
        parts: list = [prompt]
        if images:
            for img in images[:15]:  # Max 15 (10 pages + 5 embedded)
                parts.append(types.Part.from_bytes(
                    data=base64.b64decode(img["data"]),
                    mime_type=img["mime"],
                ))

        for attempt in range(4):
            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=parts,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_json_schema=schema,
                    ),
                )
                raw = response.text
                # Fix LaTeX commands colliding with JSON escapes:
                # \theta → \t(tab)+heta, \nabla → \n(newline)+abla, etc.
                # If \t/\n/\b/\f/\r is followed by alpha → it's LaTeX, escape it
                fixed = re.sub(
                    r'(?<!\\)\\([tnbfr])([a-zA-Z])',
                    lambda m: '\\\\' + m.group(1) + m.group(2),
                    raw,
                )
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    return json.loads(raw)
            except Exception as e:
                if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and attempt < 3:
                    await asyncio.sleep((attempt + 1) * 4)
                    continue
                raise

    async def generate_json(self, prompt: str) -> dict | list:
        """Call Gemini and parse JSON (fallback when not using structured output)."""
        raw = await self.generate(prompt)
        text = raw.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[: text.rfind("```")]

        text = text.strip()
        start = -1
        for i, ch in enumerate(text):
            if ch in "{[":
                start = i
                break
        if start >= 0:
            bracket = text[start]
            close = "}" if bracket == "{" else "]"
            depth = 0
            end = start
            for i in range(start, len(text)):
                if text[i] == bracket:
                    depth += 1
                elif text[i] == close:
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            text = text[start : end + 1]

        # Fix LaTeX commands colliding with JSON escapes (\theta, \nabla, etc.)
        text = re.sub(
            r'(?<!\\)\\([tnbfr])([a-zA-Z])',
            lambda m: '\\\\' + m.group(1) + m.group(2),
            text,
        )

        for attempt in range(3):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                if attempt == 0:
                    text = self._fix_json_backslashes(text)
                elif attempt == 1:
                    fix_prompt = "Fix ONLY the JSON syntax errors. Return valid JSON. Do not change content:\n\n" + text
                    raw_fixed = await self.generate(fix_prompt)
                    text = raw_fixed.strip()
                    if text.startswith("```"):
                        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                    if text.endswith("```"):
                        text = text[: text.rfind("```")]
                    text = text.strip()
                else:
                    raise

    @staticmethod
    def _fix_json_backslashes(text: str) -> str:
        result = []
        in_string = False
        i = 0
        while i < len(text):
            ch = text[i]
            if ch == '"' and (i == 0 or text[i - 1] != '\\'):
                in_string = not in_string
                result.append(ch)
            elif in_string and ch == '\\':
                if i + 1 < len(text) and text[i + 1] in '"\\bfnrtu/':
                    result.append(ch)
                else:
                    result.append('\\\\')
            else:
                result.append(ch)
            i += 1
        return ''.join(result)


_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    global _client
    if _client is None:
        _client = GeminiClient()
    return _client
