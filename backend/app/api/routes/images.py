import base64
import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

# Disk-based image storage
_IMAGE_DIR = Path(__file__).parents[3] / "data" / "images"
_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def store_images(session_id: str, images: list[dict]):
    """Save images to disk during upload."""
    if not images:
        return
    session_dir = _IMAGE_DIR / session_id
    session_dir.mkdir(exist_ok=True)

    # Save metadata
    meta = []
    for i, img in enumerate(images):
        # Save image binary
        img_bytes = base64.b64decode(img["data"])
        ext = img["mime"].split("/")[-1] if "/" in img["mime"] else "png"
        img_path = session_dir / f"{i}.{ext}"
        img_path.write_bytes(img_bytes)

        meta.append({
            "index": i,
            "filename": img_path.name,
            "mime": img["mime"],
            "page": img.get("page", 0),
            "width": img.get("width", 0),
            "height": img.get("height", 0),
        })

    (session_dir / "meta.json").write_text(json.dumps(meta))


def _load_meta(session_id: str) -> list[dict]:
    meta_path = _IMAGE_DIR / session_id / "meta.json"
    if not meta_path.exists():
        return []
    return json.loads(meta_path.read_text())


@router.get("/sessions/{session_id}/images")
async def list_images(session_id: str):
    """Return list of images for the session."""
    meta = _load_meta(session_id)
    return {
        "session_id": session_id,
        "images": [
            {"index": m["index"], "page": m["page"], "width": m["width"], "height": m["height"]}
            for m in meta
        ],
    }


@router.get("/sessions/{session_id}/images/{index}")
async def get_image(session_id: str, index: int):
    """Return a specific image as binary."""
    meta = _load_meta(session_id)
    if index < 0 or index >= len(meta):
        raise HTTPException(status_code=404, detail="Image not found")

    m = meta[index]
    img_path = _IMAGE_DIR / session_id / m["filename"]
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return Response(
        content=img_path.read_bytes(),
        media_type=m["mime"],
    )
