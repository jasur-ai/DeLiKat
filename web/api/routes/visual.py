"""
DeLiKet API — CLIP AI Visual Search endpoint
POST /api/visual-search — Upload image + optional text, find similar lots
"""

import io
import logging
import pickle
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from api.database import SessionLocal
from api.database.models import Lot, ImageEmbedding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["visual-search"])

# Lazy-loaded CLIP service
_vision_service = None


def get_vision_service():
    global _vision_service
    if _vision_service is None:
        try:
            from bot.services.vision_service import (
                is_available, generate_image_embedding,
                generate_text_embedding, generate_multimodal_embedding,
                find_similar_lots, cosine_similarity
            )
            _vision_service = {
                "available": is_available,
                "img_emb": generate_image_embedding,
                "txt_emb": generate_text_embedding,
                "multi_emb": generate_multimodal_embedding,
                "search": find_similar_lots,
                "similarity": cosine_similarity,
            }
        except Exception as e:
            logger.warning(f"CLIP vision service unavailable: {e}")
            _vision_service = {"available": lambda: False}
    return _vision_service


@router.post("/visual-search")
async def visual_search(
    image: Optional[UploadFile] = File(None, description="Product image (JPEG/PNG)"),
    text: Optional[str] = Form(None, description="Optional text description for multimodal search"),
    limit: int = Form(8, description="Max results"),
    min_similarity: float = Form(0.3, description="Minimum similarity threshold (0-1)"),
):
    """
    Upload an image and/or text description to find similar lots using CLIP AI.

    Returns visually and semantically similar products from the marketplace.

    - image + text → multimodal search (weighted combination)
    - image only → visual similarity search
    - text only → semantic text search
    """
    if not image and not text:
        raise HTTPException(status_code=400, detail="Rasm yoki matn yuboring")

    vs = get_vision_service()
    if not vs["available"]():
        raise HTTPException(status_code=503, detail="CLIP AI modeli yuklanmagan. Keyinroq urinib ko'ring.")

    db = SessionLocal()
    try:
        # ── Generate embedding ──
        image_bytes = None
        if image:
            try:
                image_bytes = await image.read()
                if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
                    raise HTTPException(status_code=400, detail="Rasm hajmi 10MB dan oshmasligi kerak")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Rasmni o'qib bo'lmadi")

        if image_bytes and text:
            # Multimodal: image + text
            embedding = vs["multi_emb"](image_data=image_bytes, text=text, weights=(0.6, 0.4))
            search_type = "multimodal"
        elif image_bytes:
            # Image-only
            embedding = vs["img_emb"](image_bytes)
            search_type = "image"
        elif text:
            # Text-only (CLIP semantic search)
            embedding = vs["txt_emb"](text)
            search_type = "text"
        else:
            raise HTTPException(status_code=400, detail="Hech narsa yuborilmadi")

        if embedding is None:
            raise HTTPException(status_code=503, detail="CLIP embedding generatsiya qilib bo'lmadi")

        # ── Search similar lots ──
        results = vs["search"](embedding, db, limit=limit)

        if not results:
            # Try with lower threshold - load all and filter manually
            all_embeddings = db.query(ImageEmbedding).all()
            scored = []
            for emb in all_embeddings:
                try:
                    stored_vec = emb.embedding
                    if isinstance(stored_vec, bytes):
                        stored_vec = pickle.loads(stored_vec)
                    sim = vs["similarity"](embedding, stored_vec)
                    if sim >= min_similarity:
                        lot = db.query(Lot).filter(
                            Lot.id == emb.lot_id,
                            Lot.status == 'aktiv'
                        ).first()
                        if lot:
                            scored.append((lot, sim))
                except Exception:
                    continue
            scored.sort(key=lambda x: x[1], reverse=True)
            results = scored[:limit]

        # ── Format response ──
        lots_data = []
        for lot, similarity in results:
            lots_data.append({
                "id": lot.id,
                "title": lot.title[:100],
                "category": lot.category,
                "price": lot.price,
                "price_formatted": fmt_price(lot.price),
                "grade": lot.grade or '',
                "quantity": lot.quantity,
                "status": lot.status,
                "similarity": round(float(similarity), 4),
                "image_url": None,  # Image serving endpoint TBD
            })

        return {
            "status": "ok",
            "search_type": search_type,
            "query": {
                "has_image": image_bytes is not None,
                "text": text[:100] if text else None,
            },
            "count": len(lots_data),
            "results": lots_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Visual search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error during visual search")
    finally:
        db.close()


def fmt_price(p: float) -> str:
    """Format price in Uzbek style"""
    if not p:
        return "0 so'm"
    if p >= 1_000_000:
        return f"{p/1_000_000:.1f} mln so'm"
    if p >= 1_000:
        return f"{p/1_000:.0f} ming so'm"
    return f"{int(p):,} so'm"
