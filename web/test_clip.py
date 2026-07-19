"""CLIP AI Visual Search — Test Script"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from bot.services.vision_service import (
    is_available, generate_text_embedding,
    generate_image_embedding, generate_multimodal_embedding,
    find_similar_lots, cosine_similarity
)
from api.database import SessionLocal
from api.database.models import Lot
import numpy as np

SEP = "=" * 60

print(SEP)
print("  CLIP AI Visual Search — Test")
print(SEP)

# 1. Check model availability
print("\n[1/5] CLIP model yuklanmoqda...")
avail = is_available()
if not avail:
    print("  ❌ CLIP model mavjud emas!")
    sys.exit(1)
print("  ✅ CLIP model tayyor (512-dim)")

# 2. Test text embedding
print(f"\n[2/5] Text embedding test...")
texts = [
    "smartphone iPhone 13 Pro 128GB",
    "notebook laptop for programming 500 dollar",
    "AirPods Pro wireless earphone",
]
for txt in texts:
    emb = generate_text_embedding(txt)
    if emb is not None:
        print(f"  ✅ '{txt[:40]}...' -> {len(emb)}-dim vector")
        print(f"     First 5 values: {emb[:5].round(3)}")
    else:
        print(f"  ❌ '{txt[:40]}...' failed")

# 3. Test cosine similarity between text queries
print(f"\n[3/5] Cosine similarity (semantic understanding)...")
emb1 = generate_text_embedding("iPhone 13 smartphone")
emb2 = generate_text_embedding("Samsung Galaxy phone")
emb3 = generate_text_embedding("fresh apples fruit")
if all(e is not None for e in [emb1, emb2, emb3]):
    sim_phone_phone = cosine_similarity(emb1, emb2)
    sim_phone_fruit = cosine_similarity(emb1, emb3)
    print(f"  📱 iPhone ↔ Samsung: {sim_phone_phone:.3f}")
    print(f"  📱 iPhone ↔ apples:  {sim_phone_fruit:.3f}")
    if sim_phone_phone > sim_phone_fruit:
        print("  ✅ CLIP understands semantic similarity!")
    else:
        print("  ⚠️ Semantic understanding needs tuning")

# 4. Search lots by text (CLIP vs keyword)
print(f"\n[4/5] CLIP semantic search test...")
db = SessionLocal()
try:
    lots = db.query(Lot).filter(Lot.status == 'aktiv').limit(5).all()
    print(f"  📦 Database'da {len(lots)} aktiv lot bor")

    # Test text search
    query = "telefon smartphone"
    emb = generate_text_embedding(query)
    if emb is not None:
        results = find_similar_lots(emb, db, limit=5)
        print(f"\n  Query: '{query}'")
        if results:
            print(f"  CLIP results: {len(results)} ta")
            for lot, score in results:
                print(f"    #{lot.id} {lot.title[:45]} (similarity: {score:.3f})")
        else:
            print(f"  ⚠️ Hech narsa topilmadi (embeddinglar yo'q)")
    
    # Also test keyword search
    from sqlalchemy import or_
    kw_results = db.query(Lot).filter(
        Lot.status == 'aktiv',
        or_(*[Lot.title.ilike(f'%{w}%') for w in query.split() if len(w) > 2])
    ).limit(5).all()
    print(f"  Keyword results: {len(kw_results)} ta")
    for lot in kw_results[:3]:
        print(f"    #{lot.id} {lot.title[:45]}")

finally:
    db.close()

# 5. Multimodal test (text only since no image)
print(f"\n[5/5] Generate test image embedding...")
try:
    # Create a simple test image
    from PIL import Image
    import io
    img = Image.new('RGB', (224, 224), color='red')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_bytes = buf.getvalue()

    emb_img = generate_image_embedding(img_bytes)
    if emb_img is not None:
        print(f"  ✅ Image embedding: {len(emb_img)}-dim vector")
        
        # Test multimodal
        text = "red smartphone case"
        emb_multi = generate_multimodal_embedding(
            image_data=img_bytes, text=text, weights=(0.5, 0.5)
        )
        if emb_multi is not None:
            print(f"  ✅ Multimodal (image+text): {len(emb_multi)}-dim vector")
    else:
        print(f"  ⚠️ Image embedding failed (model may need image files)")
except Exception as e:
    print(f"  ⚠️ Image test: {e}")

print(f"\n{SEP}")
print("  ✅ CLIP test completed!")
print("  ⚡ Bot Telegram'da /vs yoki /vs [query] buyrug'i bilan ishlaydi")
print(SEP)
