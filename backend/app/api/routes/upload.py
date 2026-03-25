import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routes.images import store_images
from app.services.concept_extractor import extract_concepts
from app.services.pdf_parser import parse_pdf_to_markdown

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """File upload → PDF parsing → Gemini concept extraction → return session_id."""
    file_bytes = await file.read()
    filename = file.filename or "unknown.pdf"

    # PDF/image → text + image extraction
    result = await parse_pdf_to_markdown(file_bytes, filename)

    # Generate session_id
    session_id = uuid.uuid4().hex[:16]

    # Save only embedded images as figures (page images are only for Gemini reading)
    store_images(session_id, result.images)

    # Extract concepts via Gemini (page images + embedded images multimodal) → save Node/Edge to DB
    try:
        await extract_concepts(
            result.text, session_id, db,
            images=result.images,
            page_images=result.page_images,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"AI extraction failed: {e}")

    return {"session_id": session_id}
