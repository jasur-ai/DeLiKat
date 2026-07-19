"""DeLiKet API — Deal Manager (Real B2B Transaction Tracking)"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy import func, case
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from api.database import SessionLocal
from api.database.models import Transaction, Lot, User, Bid, Rating, Dispute, CounterOffer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deals", tags=["deals"])

# ── Auth dependencies ──
from api.routes.auth import get_current_user


async def require_deal_access(deal_id: int, user: User = Depends(get_current_user)) -> tuple:
    """Ensure user is admin, buyer, or seller of the deal.
    Returns the (deal, user) tuple for reuse."""
    db = SessionLocal()
    try:
        deal = db.query(Transaction).filter(Transaction.id == deal_id).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Bitim topilmadi")
        if not user.is_admin and user.id not in (deal.buyer_id, deal.seller_id):
            raise HTTPException(status_code=403, detail="Siz bu bitimga kirish huquqiga ega emassiz")
        return deal, user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deal access check error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


def _deal_to_dict(tx: Transaction) -> dict:
    """Convert a Transaction to a rich deal dict with related data."""
    lot = tx.lot
    buyer = tx.buyer
    seller = tx.seller

    # Get the accepted bid for this lot/buyer if any
    bid_price = None
    bid_qty = 1
    if lot and hasattr(lot, 'bids') and lot.bids:
        accepted = [b for b in lot.bids if b.status == "qabul" and b.buyer_id == tx.buyer_id]
        if accepted:
            bid_price = accepted[0].price
            bid_qty = accepted[0].quantity

    # Determine deal stage
    status_map = {
        "kutmoqda": "pending",
        "yigilmoqda": "processing",
        "jo'natildi": "shipped",
        "yetkazildi": "delivered",
        "yakunlandi": "completed",
        "bahslashilgan": "disputed",
        "bekor_qilindi": "cancelled",
    }

    stage = status_map.get(tx.status, "pending")
    payment_status = "escrow" if tx.status in ("kutmoqda", "yigilmoqda", "jo'natildi", "yetkazildi") else \
                    "released" if tx.status == "yakunlandi" else \
                    "disputed" if tx.status == "bahslashilgan" else "pending"

    return {
        "id": tx.id,
        "lot_id": tx.lot_id,
        "lot_title": lot.title if lot else "Noma'lum",
        "lot_category": lot.category if lot else "",
        "lot_grade": lot.grade if lot else "",
        "buyer": {
            "id": buyer.id if buyer else 0,
            "name": buyer.name if buyer else "Noma'lum",
            "rating": buyer.rating if buyer else 0,
        },
        "seller": {
            "id": seller.id if seller else 0,
            "name": seller.name if seller else "Noma'lum",
            "rating": seller.rating if seller else 0,
        },
        "amount": tx.amount,
        "bid_price": bid_price or tx.amount,
        "quantity": bid_qty,
        "status": tx.status,
        "stage": stage,
        "payment_status": payment_status,
        "buyer_confirmed": tx.buyer_confirmed or False,
        "seller_confirmed": tx.seller_confirmed or False,
        "created_at": tx.created_at.isoformat() if tx.created_at else "",
        "completed_at": tx.completed_at.isoformat() if tx.completed_at else "",
        "delivery_status": "kutilmoqda",
        "delivery_address": "",
    }


@router.get("")
async def list_deals(
    user: User = Depends(get_current_user),
    status: str = Query("", description="Filter by status"),
    seller_id: int = Query(0, description="Filter by seller ID"),
    buyer_id: int = Query(0, description="Filter by buyer ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all deals/transactions with filters.

    Authorization: Admin sees all. Non-admin sees only their deals.
    """
    db = SessionLocal()
    try:
        query = db.query(Transaction)

        # Non-admin: restrict to own deals
        if not user.is_admin:
            query = query.filter(
                (Transaction.buyer_id == user.id) | (Transaction.seller_id == user.id)
            )

        if status:
            query = query.filter(Transaction.status == status)
        if seller_id:
            query = query.filter(Transaction.seller_id == seller_id)
        if buyer_id:
            query = query.filter(Transaction.buyer_id == buyer_id)

        total = query.count()
        deals = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()

        return {
            "ok": True,
            "deals": [_deal_to_dict(d) for d in deals],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Deals list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/{deal_id}")
async def get_deal_detail(
    deal_id: int,
    user: User = Depends(get_current_user),
):
    """Get full deal detail — lot, buyer, seller, status history, disputes, counter-offers.

    Authorization: Admin, buyer, or seller of the deal.
    """
    db = SessionLocal()
    try:
        deal = db.query(Transaction).options(
            joinedload(Transaction.lot),
            joinedload(Transaction.buyer),
            joinedload(Transaction.seller),
        ).filter(Transaction.id == deal_id).first()

        if not deal:
            raise HTTPException(status_code=404, detail="Bitim topilmadi")

        # Auth check: admin or participant
        if not user.is_admin and user.id not in (deal.buyer_id, deal.seller_id):
            raise HTTPException(status_code=403, detail="Siz bu bitimga kirish huquqiga ega emassiz")

        lot = deal.lot
        buyer = deal.buyer
        seller = deal.seller

        # ── Status history (from created_at → completed_at) ──
        status_flow = {
            "kutmoqda": "⏳ Bitim yaratildi",
            "yigilmoqda": "📦 Mahsulot yig'ilmoqda",
            "jo'natildi": "🚚 Mahsulot jo'natildi",
            "yetkazildi": "✅ Mahsulot yetkazildi",
            "yakunlandi": "🎉 Bitim yakunlandi",
            "bahslashilgan": "⚠️ Bahs ochildi",
            "bekor_qilindi": "❌ Bitim bekor qilindi",
        }

        status_history = []
        created_at = deal.created_at
        completed_at = deal.completed_at

        # Build status history based on current status
        status_order = ["kutmoqda", "yigilmoqda", "jo'natildi", "yetkazildi", "yakunlandi"]
        for i, s in enumerate(status_order):
            if s == deal.status or (status_order.index(deal.status) >= i if deal.status in status_order else False):
                timestamp = created_at if i == 0 else (completed_at if s == "yakunlandi" else None)
                status_history.append({
                    "status": s,
                    "label": status_flow.get(s, s),
                    "is_current": s == deal.status,
                    "timestamp": timestamp.isoformat() if timestamp else None,
                })

        # If disputed or cancelled, add those at the end
        if deal.status in ("bahslashilgan", "bekor_qilindi"):
            status_history.append({
                "status": deal.status,
                "label": status_flow.get(deal.status, deal.status),
                "is_current": True,
                "timestamp": completed_at.isoformat() if completed_at else created_at.isoformat() if created_at else None,
            })

        # ── Disputes ──
        disputes = db.query(Dispute).filter(
            Dispute.transaction_id == deal.id
        ).order_by(Dispute.created_at.desc()).all()

        disputes_data = []
        for d in disputes:
            initiator = db.query(User).filter(User.id == d.initiator_id).first()
            resolver = db.query(User).filter(User.id == d.resolved_by).first() if d.resolved_by else None
            disputes_data.append({
                "id": d.id,
                "reason": d.reason,
                "status": d.status,
                "initiator_name": initiator.name if initiator else "",
                "resolution": d.resolution or "",
                "resolver_name": resolver.name if resolver else "",
                "created_at": d.created_at.isoformat() if d.created_at else "",
                "resolved_at": d.resolved_at.isoformat() if d.resolved_at else "",
            })

        # ── Counter offers ──
        counter_offers = db.query(CounterOffer).filter(
            CounterOffer.lot_id == deal.lot_id
        ).order_by(CounterOffer.created_at.desc()).all()

        counters_data = []
        for co in counter_offers:
            buyer_user = db.query(User).filter(User.id == co.buyer_id).first()
            counters_data.append({
                "id": co.id,
                "buyer_name": buyer_user.name if buyer_user else "",
                "offer_price": co.offer_price,
                "counter_price": co.counter_price,
                "status": co.status,
                "message": co.message or "",
                "created_at": co.created_at.isoformat() if co.created_at else "",
            })

        # ── Lot bids on this deal ──
        bids = []
        if lot:
            lot_bids = db.query(Bid).filter(Bid.lot_id == lot.id).order_by(Bid.created_at.desc()).all()
            for b in lot_bids:
                bidder = db.query(User).filter(User.id == b.buyer_id).first()
                bids.append({
                    "id": b.id,
                    "buyer_name": bidder.name if bidder else "",
                    "price": b.price,
                    "quantity": b.quantity,
                    "status": b.status,
                    "created_at": b.created_at.isoformat() if b.created_at else "",
                })

        return {
            "ok": True,
            "deal": {
                **(_deal_to_dict(deal)),
                "lot_description": lot.description if lot else "",
                "lot_image": lot.image_file_id if lot else None,
                "lot_category_label": lot.category if lot else "",
                "lot_grade_label": f"{lot.grade} nav" if lot and lot.grade else "",
                "status_history": status_history,
                "disputes": disputes_data,
                "counter_offers": counters_data,
                "bids": bids,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deal detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/shops/{shop_id}")
async def shop_detail(
    shop_id: int,
    user: User = Depends(get_current_user),
):
    """Get full seller/shop profile — lots, deals, rating breakdown.

    Authorization: Any authenticated user.
    """
    db = SessionLocal()
    try:
        seller = db.query(User).filter(User.id == shop_id).first()
        if not seller:
            raise HTTPException(status_code=404, detail="Do'kon topilmadi")

        # ── Stats ──
        total_lots = db.query(Lot).filter(Lot.seller_id == shop_id).count()
        active_lots = db.query(Lot).filter(Lot.seller_id == shop_id, Lot.status == "aktiv").count()
        sold_lots = db.query(Lot).filter(Lot.seller_id == shop_id, Lot.status == "sotilgan").count()

        # ── Deals ──
        deal_stats = db.query(
            func.count(Transaction.id),
            func.sum(Transaction.amount),
            func.sum(case((Transaction.status == "yakunlandi", 1), else_=0)),
            func.sum(case((Transaction.status == "kutmoqda", 1), else_=0)),
        ).filter(Transaction.seller_id == shop_id).first()

        total_deals = deal_stats[0] or 0
        total_volume = float(deal_stats[1] or 0)
        completed_deals = deal_stats[2] or 0
        pending_deals = deal_stats[3] or 0

        # ── Recent lots (max 20) ──
        recent_lots = db.query(Lot).filter(
            Lot.seller_id == shop_id
        ).order_by(Lot.created_at.desc()).limit(20).all()

        lots_data = []
        for lot in recent_lots:
            bid_count = db.query(func.count(Bid.id)).filter(
                Bid.lot_id == lot.id
            ).scalar() or 0
            lots_data.append({
                "id": lot.id,
                "title": lot.title,
                "category": lot.category,
                "grade": lot.grade,
                "price": float(lot.price) if lot.price else 0,
                "quantity": lot.quantity or 0,
                "status": lot.status,
                "view_count": lot.view_count or 0,
                "bid_count": bid_count,
                "created_at": lot.created_at.isoformat() if lot.created_at else "",
            })

        # ── Recent deals (max 10) ──
        recent_deals = db.query(Transaction).filter(
            Transaction.seller_id == shop_id
        ).order_by(Transaction.created_at.desc()).limit(10).all()

        deals_data = []
        for d in recent_deals:
            buyer = db.query(User).filter(User.id == d.buyer_id).first()
            lot = db.query(Lot).filter(Lot.id == d.lot_id).first()
            deals_data.append({
                "id": d.id,
                "lot_id": d.lot_id,
                "lot_title": lot.title if lot else "",
                "buyer_name": buyer.name if buyer else "",
                "amount": float(d.amount) if d.amount else 0,
                "status": d.status,
                "created_at": d.created_at.isoformat() if d.created_at else "",
                "completed_at": d.completed_at.isoformat() if d.completed_at else "",
            })

        # ── Rating breakdown ──
        ratings = db.query(Rating).filter(Rating.rated_id == shop_id).all()
        rating_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r in ratings:
            rating_counts[r.score] = rating_counts.get(r.score, 0) + 1

        recent_ratings = []
        for r in sorted(ratings, key=lambda x: x.created_at or datetime(2000, 1, 1, tzinfo=timezone.utc), reverse=True)[:5]:
            rater = db.query(User).filter(User.id == r.rater_id).first()
            recent_ratings.append({
                "rater_name": rater.name if rater else "",
                "score": r.score,
                "comment": r.comment or "",
                "created_at": r.created_at.isoformat() if r.created_at else "",
            })

        # ── Last active ──
        last_lot = db.query(Lot.created_at).filter(
            Lot.seller_id == shop_id
        ).order_by(Lot.created_at.desc()).first()
        last_deal = db.query(Transaction.created_at).filter(
            Transaction.seller_id == shop_id
        ).order_by(Transaction.created_at.desc()).first()
        last_active = (last_deal or last_lot or [None])[0]

        return {
            "ok": True,
            "shop": {
                "id": seller.id,
                "name": seller.name,
                "phone": seller.phone or "",
                "rating": seller.rating or 0,
                "trust_score": seller.trust_score or 0,
                "role": seller.role or "",
                "is_verified": seller.is_verified or False,
                "total_lots": total_lots,
                "active_lots": active_lots,
                "sold_lots": sold_lots,
                "total_deals": total_deals,
                "completed_deals": completed_deals,
                "pending_deals": pending_deals,
                "total_volume": total_volume,
                "avg_deal_value": round(total_volume / total_deals, 2) if total_deals > 0 else 0,
                "lots": lots_data,
                "deals": deals_data,
                "rating_counts": rating_counts,
                "recent_ratings": recent_ratings,
                "last_active": last_active.isoformat() if last_active else "",
                "registered_at": seller.created_at.isoformat() if seller.created_at else "",
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shop detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.patch("/{deal_id}")
async def update_deal(
    deal_id: int,
    status: str = Body("", description="New status (jo'natildi, yetkazildi, yakunlandi, bahslashilgan, bekor_qilindi)"),
    _: tuple = Depends(require_deal_access),
):
    """Update deal status — advance deal through its lifecycle.

    Authorization: Admin, buyer, or seller of the deal.

    Valid transitions:
      kutmoqda → jo'natildi → yetkazildi → yakunlandi
      Any → bahslashilgan (dispute)
      Any → bekor_qilindi (cancel)
    """
    if not status:
        raise HTTPException(status_code=400, detail="Status kiritilmadi")

    valid_statuses = {"kutmoqda", "yigilmoqda", "jo'natildi", "yetkazildi", "yakunlandi", "bahslashilgan", "bekor_qilindi"}
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri status: {status}")

    # Define valid forward transitions
    FORWARD_FLOW = {
        "kutmoqda": {"jo'natildi"},
        "yigilmoqda": {"jo'natildi"},
        "jo'natildi": {"yetkazildi"},
        "yetkazildi": {"yakunlandi"},
        "yakunlandi": set(),   # Terminal state
        "bahslashilgan": set(),  # Terminal
        "bekor_qilindi": set(),  # Terminal
    }

    db = SessionLocal()
    try:
        deal = db.query(Transaction).filter(Transaction.id == deal_id).first()
        current = deal.status or "kutmoqda"

        # Allow dispute or cancel from any non-terminal state
        if status in ("bahslashilgan", "bekor_qilindi"):
            if current in ("yakunlandi", "bahslashilgan", "bekor_qilindi"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Bitim allaqachon {current} holatida. O'zgartirib bo'lmaydi."
                )
        else:
            # Forward transition validation
            allowed = FORWARD_FLOW.get(current, set())
            if status not in allowed:
                allowed_str = ', '.join(sorted(allowed)) if allowed else "hech qanday o'tish mumkin emas"
                raise HTTPException(
                    status_code=400,
                    detail=f"'{current}' → '{status}' noto'g'ri o'tish. Faqat: {allowed_str}"
                )

        # Update the deal
        deal.status = status

        # Set completed_at if completed
        if status == "yakunlandi":
            deal.completed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(deal)

        # ── Send Telegram notification to buyer/seller ──
        try:
            from api.webhook_bot import send_deal_notification
            lot = deal.lot
            await send_deal_notification(
                deal_id=deal.id,
                old_status=current,
                new_status=status,
                buyer_id=deal.buyer_id,
                seller_id=deal.seller_id,
                lot_title=lot.title if lot else "",
                amount=float(deal.amount) if deal.amount else 0,
            )
        except Exception:
            pass  # Notification failure is non-critical

        return {
            "ok": True,
            "deal": _deal_to_dict(deal),
            "message": f"Bitim #{deal_id} statusi '{status}' ga o'zgartirildi",
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Deal update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/shops")
async def shop_stats(
    user: User = Depends(get_current_user),
    search: str = Query("", description="Search by seller name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get seller/shop stats — lots, deals, volume per seller.

    Authorization: Any authenticated user.
    """
    db = SessionLocal()
    try:
        # Get all sellers who have lots or transactions
        sellers_with_lots = db.query(
            User.id,
            User.name,
            User.phone,
            User.rating,
            User.trust_score,
            User.created_at,
            func.count(Lot.id).label("lot_count"),
            func.sum(Lot.view_count).label("total_views"),
        ).outerjoin(Lot, Lot.seller_id == User.id)

        if search:
            sellers_with_lots = sellers_with_lots.filter(User.name.ilike(f"%{search}%"))

        sellers_with_lots = sellers_with_lots.group_by(User.id).order_by(
            func.count(Lot.id).desc()
        ).offset(offset).limit(limit).all()

        # Get total count for pagination
        count_query = db.query(func.count(func.distinct(User.id))).filter(
            User.id.in_(db.query(Lot.seller_id).distinct())
        )
        if search:
            count_query = count_query.filter(User.name.ilike(f"%{search}%"))
        total_count = count_query.scalar() or 0

        shops = []
        for s in sellers_with_lots:
            if not s.id:
                continue

            # Get deal stats per seller
            deal_stats = db.query(
                func.count(Transaction.id),
                func.sum(Transaction.amount),
                func.sum(case((Transaction.status == "yakunlandi", 1), else_=0)),
                func.sum(case((Transaction.status == "kutmoqda", 1), else_=0)),
            ).filter(Transaction.seller_id == s.id).first()

            total_deals = deal_stats[0] or 0
            total_volume = float(deal_stats[1] or 0)
            completed_deals = deal_stats[2] or 0
            pending_deals = deal_stats[3] or 0

            # Get last activity
            last_lot = db.query(Lot.created_at).filter(
                Lot.seller_id == s.id
            ).order_by(Lot.created_at.desc()).first()
            last_deal = db.query(Transaction.created_at).filter(
                Transaction.seller_id == s.id
            ).order_by(Transaction.created_at.desc()).first()

            last_active = (last_deal or last_lot or [None])[0]

            shops.append({
                "id": s.id,
                "name": s.name,
                "phone": s.phone or "",
                "rating": s.rating or 0,
                "trust_score": s.trust_score or 0,
                "lots": s.lot_count or 0,
                "total_deals": total_deals,
                "completed_deals": completed_deals,
                "pending_deals": pending_deals,
                "total_volume": total_volume,
                "avg_deal_value": round(total_volume / total_deals, 2) if total_deals > 0 else 0,
                "last_active": last_active.isoformat() if last_active else "",
                "registered_at": s.created_at.isoformat() if s.created_at else "",
            })

        return {
            "ok": True,
            "shops": shops,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Shop stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/lots")
async def seller_lots(
    user: User = Depends(get_current_user),
    seller_id: int = Query(0, description="Filter by seller ID"),
    status: str = Query("", description="Filter by lot status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get lot stats per seller — breakdown of lots, bids, deals.

    Authorization: Any authenticated user.
    """
    db = SessionLocal()
    try:
        query = db.query(
            Lot.id,
            Lot.title,
            Lot.category,
            Lot.grade,
            Lot.price,
            Lot.quantity,
            Lot.status,
            Lot.view_count,
            Lot.created_at,
            func.count(func.distinct(Bid.id)).label("bid_count"),
            func.coalesce(func.max(Bid.price), 0).label("highest_bid"),
        ).outerjoin(Bid, Bid.lot_id == Lot.id)

        if seller_id:
            query = query.filter(Lot.seller_id == seller_id)
        if status:
            query = query.filter(Lot.status == status)

        total_query = db.query(func.count(Lot.id))
        if seller_id:
            total_query = total_query.filter(Lot.seller_id == seller_id)
        if status:
            total_query = total_query.filter(Lot.status == status)
        total_count = total_query.scalar() or 0

        lots = query.group_by(Lot.id).order_by(Lot.created_at.desc()).offset(offset).limit(limit).all()

        result = []
        for row in lots:
            # Check if this lot has a completed deal
            deal = db.query(Transaction).filter(
                Transaction.lot_id == row.id,
                Transaction.status == "yakunlandi"
            ).first()

            result.append({
                "id": row.id,
                "title": row.title,
                "category": row.category,
                "grade": row.grade,
                "price": float(row.price) if row.price else 0,
                "quantity": row.quantity or 0,
                "status": row.status,
                "views": row.view_count or 0,
                "bid_count": row.bid_count or 0,
                "highest_bid": float(row.highest_bid) if row.highest_bid else 0,
                "has_deal": deal is not None,
                "created_at": row.created_at.isoformat() if row.created_at else "",
            })

        return {
            "ok": True,
            "lots": result,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Seller lots error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/stats")
async def deal_stats(
    since: str = Query("", description="Check if stats changed since this timestamp"),
):
    """Get deal statistics summary.

    Authorization: Public — no auth required.
    """
    db = SessionLocal()
    try:
        total = db.query(Transaction).count()
        pending = db.query(Transaction).filter(Transaction.status == "kutmoqda").count()
        completed = db.query(Transaction).filter(Transaction.status == "yakunlandi").count()
        disputed = db.query(Transaction).filter(Transaction.status == "bahslashilgan").count()

        # Total volume
        volume_result = db.query(func.sum(Transaction.amount)).filter(
            Transaction.status == "yakunlandi"
        ).first()
        total_volume = float(volume_result[0] or 0)

        # Recent deals (last 7 days)
        from datetime import timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent = db.query(Transaction).filter(
            Transaction.created_at >= week_ago
        ).count()

        # Unique buyers & sellers
        unique_buyers = db.query(func.count(func.distinct(Transaction.buyer_id))).scalar() or 0
        unique_sellers = db.query(func.count(func.distinct(Transaction.seller_id))).scalar() or 0

        # Check if there are new deals since given timestamp (for polling)
        has_updates = False
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                new_count = db.query(Transaction).filter(
                    Transaction.created_at > since_dt
                ).count()
                has_updates = new_count > 0
            except ValueError:
                pass

        return {
            "ok": True,
            "stats": {
                "total": total,
                "pending": pending,
                "completed": completed,
                "disputed": disputed,
                "total_volume": total_volume,
                "recent_7d": recent,
                "unique_buyers": unique_buyers,
                "unique_sellers": unique_sellers,
                "has_updates": has_updates,
            }
        }
    except Exception as e:
        logger.error(f"Deal stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()
