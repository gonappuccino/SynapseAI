import base64
import tempfile
from pathlib import Path


class ParseResult:
    """PDF parse result: text + images + page images."""
    def __init__(self, text: str, images: list[dict] | None = None, page_images: list[dict] | None = None):
        self.text = text
        self.images = images or []  # [{"data": base64_str, "mime": "image/png", "page": 1}, ...]
        self.page_images = page_images or []  # Full-page rendered images


async def parse_pdf_to_markdown(file_bytes: bytes, filename: str) -> ParseResult:
    """Convert PDF/image file to text + images."""
    suffix = Path(filename).suffix.lower()

    SUPPORTED_TYPES = (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".mp3", ".wav", ".m4a", ".ogg", ".flac")
    if suffix not in SUPPORTED_TYPES:
        raise ValueError(f"Unsupported file type: {suffix}")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if suffix == ".pdf":
            return _parse_pdf(tmp_path)
        elif suffix in (".mp3", ".wav", ".m4a", ".ogg", ".flac"):
            return await _parse_audio(tmp_path)
        else:
            return _parse_image(tmp_path, file_bytes, suffix)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _is_readable(text: str) -> bool:
    if len(text.strip()) < 20:
        return False
    printable = sum(1 for c in text[:500] if c.isprintable() or c in "\n\t")
    return printable / min(len(text), 500) > 0.7


def _parse_pdf(path: str) -> ParseResult:
    """Extract text + images + page images using PyMuPDF."""
    import fitz

    try:
        doc = fitz.open(path)
    except Exception:
        raise ValueError("PDF를 열 수 없습니다.")

    # Extract text (supplementary)
    text = "\n\n".join(page.get_text() for page in doc)
    if not _is_readable(text):
        doc.close()
        raise ValueError("PDF에서 텍스트를 추출할 수 없습니다.")

    # Render pages as images (to preserve formulas, max 10 pages)
    page_images: list[dict] = []
    for page_num in range(min(len(doc), 10)):
        page = doc[page_num]
        # DPI 150 — sufficient for reading formulas while keeping file size reasonable
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        page_images.append({
            "data": base64.b64encode(img_bytes).decode("utf-8"),
            "mime": "image/png",
            "page": page_num + 1,
            "width": pix.width,
            "height": pix.height,
        })

    # Extract embedded images (for figures)
    images: list[dict] = []
    for page_num, page in enumerate(doc):
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue
                img_bytes = base_image["image"]
                mime = base_image.get("ext", "png")
                mime_type = f"image/{mime}" if "/" not in mime else mime

                w = base_image.get("width", 0)
                h = base_image.get("height", 0)
                if w < 50 or h < 50:
                    continue

                images.append({
                    "data": base64.b64encode(img_bytes).decode("utf-8"),
                    "mime": mime_type,
                    "page": page_num + 1,
                    "width": w,
                    "height": h,
                })
            except Exception:
                continue

        if len(images) >= 10:
            break

    # Fallback: extract vector graphic figures (LaTeX PDFs, etc.)
    # If no embedded raster images, crop drawing areas and convert to figures
    if not images:
        images = _extract_vector_figures(doc)

    doc.close()
    return ParseResult(text=text, images=images, page_images=page_images)


def _extract_vector_figures(doc) -> list[dict]:
    """Crop individual figures from pages containing vector graphics (matplotlib, etc.)."""
    import fitz

    figures: list[dict] = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        drawings = page.get_drawings()
        if len(drawings) < 10:
            continue

        # Collect text block positions (to identify non-figure areas)
        text_blocks = page.get_text("blocks")
        text_rects = [fitz.Rect(b[:4]) for b in text_blocks if b[6] == 0]

        # Collect drawing rects & cluster by y-coordinate
        draw_rects = []
        for d in drawings:
            r = d.get("rect")
            if r:
                draw_rects.append(fitz.Rect(r))
        if not draw_rects:
            continue

        draw_rects.sort(key=lambda r: r.y0)

        # Vertical distance within 30pt = same cluster
        clusters: list[list] = []
        cur = [draw_rects[0]]
        for r in draw_rects[1:]:
            if r.y0 - cur[-1].y1 < 30:
                cur.append(r)
            else:
                clusters.append(cur)
                cur = [r]
        clusters.append(cur)

        for cluster in clusters:
            if len(cluster) < 15:  # Figures have many drawing commands
                continue

            # Cluster bounding box
            bbox = fitz.Rect()
            for r in cluster:
                bbox |= r

            # Skip if too small
            if bbox.width < 80 or bbox.height < 60:
                continue

            # Check text block overlap — too much text inside means it's not a figure
            overlap_count = sum(1 for tr in text_rects if bbox.contains(tr))
            if overlap_count > 3:
                continue

            # Crop
            pad = 8
            clip = fitz.Rect(
                max(0, bbox.x0 - pad), max(0, bbox.y0 - pad),
                min(page.rect.width, bbox.x1 + pad), min(page.rect.height, bbox.y1 + pad),
            )
            pix = page.get_pixmap(dpi=200, clip=clip)
            figures.append({
                "data": base64.b64encode(pix.tobytes("png")).decode("utf-8"),
                "mime": "image/png",
                "page": page_num + 1,
                "width": pix.width,
                "height": pix.height,
            })
            if len(figures) >= 10:
                return figures

    return figures


async def _parse_audio(path: str) -> ParseResult:
    """Transcribe audio file to text using Google Cloud Speech-to-Text."""
    import asyncio
    from google.cloud import speech

    with open(path, "rb") as f:
        audio_bytes = f.read()

    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(content=audio_bytes)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
        language_code="en-US",
        alternative_language_codes=["ko-KR"],
        enable_automatic_punctuation=True,
    )

    # Run synchronous API call in a thread to avoid blocking
    response = await asyncio.to_thread(client.recognize, config=config, audio=audio)

    transcript = " ".join(
        result.alternatives[0].transcript
        for result in response.results
        if result.alternatives
    )

    if not transcript.strip():
        raise ValueError("Could not transcribe any speech from the audio file.")

    return ParseResult(text=transcript, images=[], page_images=[])


def _parse_image(path: str, file_bytes: bytes, suffix: str) -> ParseResult:
    """Image file → ParseResult."""
    mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/png")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return ParseResult(
        text="[Uploaded image]",
        images=[{"data": b64, "mime": mime, "page": 1, "width": 0, "height": 0}],
    )
