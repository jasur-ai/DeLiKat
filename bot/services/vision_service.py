"""
DeLiKet Vision Service — CLIP AI Visual Search Engine
Uses FastEmbed (ONNX Runtime) for CLIP-based text+image embeddings

Upgraded from ResNet50 (image-only) to CLIP ViT-B-32 (text + image in same vector space):
- Text query "notebook 500$" → 512-dim embedding → find matching lot images
- Image upload → 512-dim embedding → find visually similar products
- Text + Image combined → weighted average → multimodal search

All embeddings live in the same 512-dimensional space, so cosine similarity
works between text and image vectors directly.
"""

import io
import logging
import os
import tempfile
from typing import Optional
from PIL import Image as PILImage
import numpy as np

logger = logging.getLogger(__name__)

# ── CLIP model configuration ──
TEXT_MODEL_NAME = "Qdrant/clip-ViT-B-32-text"
IMAGE_MODEL_NAME = "Qdrant/clip-ViT-B-32-vision"
EMBEDDING_DIM = 512  # CLIP ViT-B-32 output dimension
USE_AI = False

# Lazy-loaded models (singletons)
_image_model = None
_text_model = None


def _load_models():
    """Lazy-load both CLIP text and image models"""
    global _image_model, _text_model, USE_AI
    if _image_model is not None and _text_model is not None:
        return True

    try:
        from fastembed import ImageEmbedding, TextEmbedding

        logger.info(f"🔄 Loading CLIP image model: {IMAGE_MODEL_NAME}...")
        _image_model = ImageEmbedding(model_name=IMAGE_MODEL_NAME)

        logger.info(f"🔄 Loading CLIP text model: {TEXT_MODEL_NAME}...")
        _text_model = TextEmbedding(model_name=TEXT_MODEL_NAME)

        USE_AI = True
        logger.info(f"✅ CLIP models loaded: {EMBEDDING_DIM}-dim embeddings")
        return True
    except Exception as e:
        logger.warning(f"⚠️ CLIP models not available: {e}")
        logger.warning("   Falling back to keyword-based search")
        USE_AI = False
        return False


def is_available() -> bool:
    """Check if CLIP AI vision+text is available"""
    return USE_AI or _load_models()


# ═══════════════════════════════════════════════
# Embedding generation
# ═══════════════════════════════════════════════

def generate_image_embedding(image_data: bytes) -> Optional[np.ndarray]:
    """
    Generate CLIP embedding for an image.

    Returns 512-dim vector in the same space as text embeddings.
    Can be compared with cosine_similarity() to text queries.

    Args:
        image_data: Raw image bytes (JPEG, PNG, etc.)

    Returns:
        numpy array of shape (512,) or None on failure
    """
    if not is_available():
        return None

    global _image_model

    try:
        # Open image
        img = PILImage.open(io.BytesIO(image_data))

        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Save to temp file (fastembed expects file paths)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            img.save(tmp, format='JPEG', quality=85)
            tmp_path = tmp.name

        try:
            # Generate embedding via CLIP vision model
            embeddings = list(_image_model.embed([tmp_path]))
            if embeddings and len(embeddings) > 0:
                return np.array(embeddings[0], dtype=np.float32)
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Error generating image embedding: {e}")

    return None


def generate_text_embedding(text: str) -> Optional[np.ndarray]:
    """
    Generate CLIP embedding for a text query.

    Returns 512-dim vector in the same space as image embeddings!
    This enables text-to-image search: type "red iPhone case" →
    find images of products matching that description.

    Args:
        text: Search query text (e.g., "iPhone 13 Pro 500$")

    Returns:
        numpy array of shape (512,) or None on failure
    """
    if not is_available():
        return None

    global _text_model

    try:
        # Generate embedding via CLIP text model
        embeddings = list(_text_model.embed([text]))
        if embeddings and len(embeddings) > 0:
            return np.array(embeddings[0], dtype=np.float32)

    except Exception as e:
        logger.error(f"Error generating text embedding: {e}")

    return None


def generate_multimodal_embedding(
    image_data: Optional[bytes] = None,
    text: Optional[str] = None,
    weights: tuple = (0.5, 0.5)
) -> Optional[np.ndarray]:
    """
    Generate a combined text+image embedding (weighted average).

    When both image and text are provided, produces a single vector
    that captures both visual and semantic information.

    Args:
        image_data: Raw image bytes (optional)
        text: Text description (optional)
        weights: (image_weight, text_weight) — default equal weighting

    Returns:
        Combined 512-dim vector, or single-modality vector, or None
    """
    img_emb = generate_image_embedding(image_data) if image_data else None
    txt_emb = generate_text_embedding(text) if text else None

    if img_emb is not None and txt_emb is not None:
        # Weighted average of two vectors
        w_img, w_txt = weights
        combined = (w_img * img_emb + w_txt * txt_emb) / (w_img + w_txt)
        # Normalize to unit vector
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        return combined
    elif img_emb is not None:
        return img_emb
    elif txt_emb is not None:
        return txt_emb

    return None


# ═══════════════════════════════════════════════
# Similarity search
# ═══════════════════════════════════════════════

def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    if vec1 is None or vec2 is None:
        return 0.0
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vec1, vec2) / (norm1 * norm2))


def find_similar_lots(query_embedding: np.ndarray, db_session, limit: int = 8) -> list:
    """
    Find lots with most similar embeddings using cosine similarity.

    Works with CLIP embeddings — query can be text or image embedding
    since both live in the same 512-dim space.

    Args:
        query_embedding: Target embedding (from text or image)
        db_session: SQLAlchemy database session
        limit: Maximum number of results

    Returns:
        List of (lot, similarity_score) tuples sorted by similarity
    """
    from api.database.models import Lot, ImageEmbedding
    import pickle

    if query_embedding is None:
        return []

    try:
        # Load all embeddings from database
        all_embeddings = db_session.query(ImageEmbedding).all()

        if not all_embeddings:
            return []

        # Calculate similarities
        scored = []
        for emb in all_embeddings:
            try:
                stored_vec = emb.embedding  # PickleType auto-deserializes

                # If still bytes (fallback), try manual pickle
                if isinstance(stored_vec, bytes):
                    stored_vec = pickle.loads(stored_vec)

                similarity = cosine_similarity(query_embedding, stored_vec)

                # Get the lot
                lot = db_session.query(Lot).filter(
                    Lot.id == emb.lot_id,
                    Lot.status == 'aktiv'
                ).first()
                if lot and similarity > 0.5:  # Threshold
                    scored.append((lot, similarity))
            except Exception:
                continue

        # Sort by similarity (descending) and return top results
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]

    except Exception as e:
        logger.error(f"Error finding similar lots: {e}")
        return []


# ═══════════════════════════════════════════════
# Text-to-image search (CLIP-powered)
# ═══════════════════════════════════════════════

def search_by_text(text: str, db_session, limit: int = 8,
                   keyword_fallback: bool = True) -> list:
    """
    Search lots by text description using CLIP semantic embeddings.

    Unlike keyword search which only matches exact words, CLIP understands
    meaning: "cheap smartphone with good camera" → matches relevant products
    even if they don't contain those exact words.

    Args:
        text: Natural language search query
        db_session: SQLAlchemy database session
        limit: Maximum number of results
        keyword_fallback: If True, falls back to keyword search when CLIP fails

    Returns:
        List of (lot, similarity_score) tuples, or empty list
    """
    from api.database.models import Lot

    try:
        embedding = generate_text_embedding(text)
        if embedding is not None:
            return find_similar_lots(embedding, db_session, limit)

        # CLIP not available — fall back to keyword search
        if keyword_fallback:
            logger.info("CLIP text search unavailable, using keyword fallback")
            results = db_session.query(Lot).filter(
                Lot.status == 'aktiv',
                Lot.title.ilike(f'%{text}%')
            ).limit(limit).all()
            return [(lot, 0.0) for lot in results]

        return []

    except Exception as e:
        logger.error(f"Error in search_by_text: {e}")
        return []


# ═══════════════════════════════════════════════
# Batch pre-computation
# ═══════════════════════════════════════════════

def precompute_all_embeddings(db_session) -> dict:
    """
    Pre-compute CLIP embeddings for all lots that have images.
    Should be called after database seeding or when new lots are added.

    Returns:
        dict with 'processed', 'skipped', 'errors' counts
    """
    from api.database.models import Lot, ImageEmbedding
    import pickle

    if not is_available():
        return {'processed': 0, 'skipped': 0, 'errors': 0,
                'message': 'CLIP model not available'}

    stats = {'processed': 0, 'skipped': 0, 'errors': 0}

    lots = db_session.query(Lot).filter(
        Lot.image_file_id.isnot(None)
    ).all()

    for lot in lots:
        try:
            # Check if already embedded (skip if same model)
            existing = db_session.query(ImageEmbedding).filter(
                ImageEmbedding.lot_id == lot.id,
                ImageEmbedding.model_name == IMAGE_MODEL_NAME
            ).first()
            if existing:
                stats['skipped'] += 1
                continue

            # Remove old embedding if exists with different model
            old = db_session.query(ImageEmbedding).filter(
                ImageEmbedding.lot_id == lot.id
            ).first()
            if old:
                db_session.delete(old)

            # Try to download image from Telegram
            # Note: For batch processing, this requires Telegram bot token
            # For now, we skip since we don't have the image bytes
            stats['skipped'] += 1

        except Exception as e:
            logger.error(f"Error processing lot {lot.id}: {e}")
            stats['errors'] += 1

    if stats['processed'] > 0:
        db_session.commit()
        logger.info(f"Embedding pre-compute: {stats}")

    return stats
