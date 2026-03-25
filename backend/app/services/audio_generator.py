import asyncio
import re

from google.cloud import texttospeech

from app.services.gemini import get_gemini_client


async def _generate_audio_script(title: str, content: str) -> dict:
    """Generate audio script via Gemini: explanation + question + answer."""
    client = get_gemini_client()

    prompt = f"""\
You are creating an audio study script in English for a concept.

Rules:
- Write a clear, concise explanation (3-5 sentences) in English. Do NOT read any formulas or symbols — describe them in words instead.
- Then create 1 simple recall question about the concept.
- Then provide the answer (1 sentence).

Respond with ONLY valid JSON:
{{
  "explanation": "Clear English explanation (describe formulas in words)",
  "question": "English question",
  "answer": "English answer"
}}

--- CONCEPT ---
Title: {title}
Content: {content[:2000]}
"""

    try:
        data = await client.generate_json(prompt)
        return {
            "explanation": data.get("explanation", f"Let's learn about {title}."),
            "question": data.get("question", f"What is the key idea behind {title}?"),
            "answer": data.get("answer", f"The answer is {title}."),
        }
    except Exception:
        # Fallback
        clean = re.sub(r"\$\$?[^$]+\$\$?", "", content)
        return {
            "explanation": clean[:300],
            "question": f"What is the key idea behind {title}?",
            "answer": f"The key concept is {title}.",
        }


def _build_ssml(script: dict, title: str) -> str:
    """SSML structure: title → explanation → question → 3 seconds → answer."""
    ssml = "<speak>"

    # Title
    ssml += f'<p><s>{_escape(title)}</s></p>'
    ssml += '<break time="0.5s"/>'

    # Explanation
    ssml += f'<p>{_escape(script["explanation"])}</p>'
    ssml += '<break time="1s"/>'

    # Question
    ssml += f'<p><s>Now, here is a question.</s></p>'
    ssml += '<break time="0.5s"/>'
    ssml += f'<p><s>{_escape(script["question"])}</s></p>'

    # 3-second pause
    ssml += '<break time="3s"/>'

    # Answer
    ssml += f'<p><s>{_escape(script["answer"])}</s></p>'

    ssml += "</speak>"
    return ssml


def _escape(text: str) -> str:
    """Escape SSML special characters + remove formulas."""
    # Remove formulas
    text = re.sub(r"\$\$?[^$]+\$\$?", "", text)
    # Remove leftover LaTeX commands
    text = re.sub(r"\\[a-zA-Z]+", "", text)
    text = re.sub(r"[{}^_]", "", text)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


async def generate_audio(title: str, content: str, notation: str | None) -> bytes:
    """Generate Gemini script → convert to MP3 via Google Cloud TTS."""
    script = await _generate_audio_script(title, content)
    ssml = _build_ssml(script, title)

    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(ssml=ssml)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    response = await asyncio.to_thread(
        client.synthesize_speech,
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )

    return response.audio_content
