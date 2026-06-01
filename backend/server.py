from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import hashlib
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Mon Exam API")
api_router = APIRouter(prefix="/api")

# Constants
ADMIN_CODE = "MESSI10@@.COM"
WAVE_NUMBER = "+225 05 45 01 94 93"
ORANGE_NUMBER = "+225 07 48 11 10 50"
WHATSAPP_LINK = "https://wa.me/2250545019493"
PAYMENT_WINDOW_MIN = 5

PRICE_SINGLE = 8000
PRICE_PACK5 = 35000
PRICE_EXAM = 13000
PRICE_PACK6 = 50000


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(d: datetime) -> str:
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.isoformat()


def gen_session_id() -> str:
    return f"MEX-{secrets.token_urlsafe(12)}"


def gen_activation_code() -> str:
    """User-facing code: 8 chars, what student sees."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def gen_internal_token() -> str:
    """Server-only token: 32 chars hex, distinct from activation code. Never shown to user."""
    return secrets.token_hex(16)


def gen_order_id() -> str:
    return f"ORD-{secrets.token_urlsafe(8).upper()}"


def hash_code(activation_code: str, user_id: str, salt: str) -> str:
    """Bind activation code to user — prevents code reuse across accounts."""
    return hashlib.sha256(f"{activation_code}|{user_id}|{salt}".encode()).hexdigest()


def check_admin_code(code: Optional[str]):
    if code != ADMIN_CODE:
        raise HTTPException(status_code=401, detail="Code admin incorrect")


# ---------- Models ----------
class SessionInit(BaseModel):
    country_code: str

    @field_validator("country_code")
    @classmethod
    def valid_country(cls, v: str) -> str:
        v = v.lower()
        if v not in ("civ", "sen", "bfa", "mli"):
            raise ValueError("invalid country")
        return v


class SessionOut(BaseModel):
    user_id: str
    country_code: str
    created_at: str


class CartItemIn(BaseModel):
    subject_id: str
    sub_series: str


class CheckoutIn(BaseModel):
    user_id: str
    phone: str
    items: List[CartItemIn]
    service: Literal["realtime", "early", "accomplice", "modification", "other"]
    payment_method: Literal["wave", "orange"]
    pack: Optional[Literal["single", "pack5", "exam", "pack6"]] = "single"
    country_code: Optional[str] = "civ"

    @field_validator("phone")
    @classmethod
    def phone_check(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 8 or len(digits) > 15:
            raise ValueError("invalid phone")
        return v.strip()


class SimulatePay(BaseModel):
    order_id: str
    user_id: str
    txn_ref: str
    activation_code: str


class AdminLogin(BaseModel):
    code: str


class AdminAction(BaseModel):
    order_id: str
    action: Literal["accept", "refuse", "delete"]


# ---------- Country-specific series (real) ----------
COUNTRIES = [
    {
        "code": "civ",
        "name": "Côte d'Ivoire",
        "flag_colors": ["#FF8200", "#FFFFFF", "#00A859"],
        "primary": "#EA580C",
        "secondary": "#16A34A",
        "active": True,
    },
    {
        "code": "sen",
        "name": "Sénégal",
        "flag_colors": ["#00853F", "#FDEF42", "#E31B23"],
        "primary": "#00853F",
        "secondary": "#FDEF42",
        "active": True,
    },
    {
        "code": "bfa",
        "name": "Burkina Faso",
        "flag_colors": ["#EF2B2D", "#FCD116", "#009E49"],
        "primary": "#EF2B2D",
        "secondary": "#FCD116",
        "active": True,
    },
    {
        "code": "mli",
        "name": "Mali",
        "flag_colors": ["#14B53A", "#FCD116", "#CE1126"],
        "primary": "#14B53A",
        "secondary": "#CE1126",
        "active": True,
    },
]

# Series structure per country (real BAC series)
SERIES_BY_COUNTRY = {
    "civ": {
        "generale": {
            "label": "Série Générale",
            "description": "BAC général ivoirien",
            "color": "#16A34A",
            "sub_series": ["A1", "A2", "C", "D", "E"],
        },
        "industrielle": {
            "label": "Série F — Industrielle",
            "description": "BAC technique industriel",
            "color": "#EA580C",
            "sub_series": ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"],
        },
        "tertiaire": {
            "label": "Série G — Gestion / Tertiaire",
            "description": "BAC technique gestion",
            "color": "#1C449E",
            "sub_series": ["G1", "G2", "G3"],
        },
    },
    "sen": {
        "litteraire": {
            "label": "Série L — Littéraire",
            "description": "BAC sénégalais littéraire",
            "color": "#00853F",
            "sub_series": ["L1a", "L1b", "L2", "L'1", "L'2"],
        },
        "scientifique": {
            "label": "Série S — Scientifique",
            "description": "BAC sénégalais scientifique",
            "color": "#1C449E",
            "sub_series": ["S1", "S2", "S2A", "S3", "S4", "S5"],
        },
        "tertiaire": {
            "label": "Série G — Gestion",
            "description": "BAC technique gestion",
            "color": "#E31B23",
            "sub_series": ["G"],
        },
        "technique": {
            "label": "Série T — Technique industriel",
            "description": "BAC technique industriel sénégalais",
            "color": "#EA580C",
            "sub_series": ["T1", "T2"],
        },
    },
    "bfa": {
        "generale": {
            "label": "Série Générale",
            "description": "BAC général burkinabè",
            "color": "#009E49",
            "sub_series": ["A1", "A2", "A4", "C", "D", "E"],
        },
        "industrielle": {
            "label": "Série F — Industrielle",
            "description": "BAC technique industriel",
            "color": "#EF2B2D",
            "sub_series": ["F1", "F2", "F3", "F4"],
        },
        "tertiaire": {
            "label": "Série G — Gestion",
            "description": "BAC technique gestion",
            "color": "#FCD116",
            "sub_series": ["G1", "G2"],
        },
        "hotellerie": {
            "label": "Série H — Hôtellerie",
            "description": "BAC hôtellerie",
            "color": "#1C449E",
            "sub_series": ["H1", "H2"],
        },
    },
    "mli": {
        "litteraire": {
            "label": "TAL — Terminale Arts & Lettres",
            "description": "BAC malien littéraire",
            "color": "#14B53A",
            "sub_series": ["TAL", "TLL"],
        },
        "scientifique": {
            "label": "TSExp / TSE — Terminale Sciences",
            "description": "BAC malien scientifique",
            "color": "#CE1126",
            "sub_series": ["TSE", "TSExp", "TSL"],
        },
        "economique": {
            "label": "TSEco / TSS — Sciences éco et sociales",
            "description": "BAC malien économique",
            "color": "#FCD116",
            "sub_series": ["TSEco", "TSS"],
        },
    },
}

# Subjects per series (real BAC matières)
SUBJECTS_BY_SERIES = {
    # ---- Côte d'Ivoire ----
    "civ_generale": [
        ("Mathématiques", "calculator"),
        ("Physique-Chimie", "atom"),
        ("Sciences de la Vie et de la Terre", "leaf"),
        ("Français", "book"),
        ("Philosophie", "brain"),
        ("Histoire-Géographie", "globe"),
        ("Anglais", "language"),
        ("Espagnol", "language"),
        ("Allemand", "language"),
    ],
    "civ_industrielle": [
        ("Mathématiques", "calculator"),
        ("Physique Appliquée", "bolt"),
        ("Construction Mécanique", "gear"),
        ("Électrotechnique", "plug"),
        ("Technologie", "wrench"),
        ("Français", "book"),
        ("Dessin Industriel", "wrench"),
    ],
    "civ_tertiaire": [
        ("Économie Générale", "chart"),
        ("Comptabilité", "calculator"),
        ("Droit", "scale"),
        ("Mathématiques Financières", "chart"),
        ("Français", "book"),
        ("Anglais", "language"),
        ("Statistiques", "chart"),
    ],
    # ---- Sénégal ----
    "sen_litteraire": [
        ("Philosophie", "brain"),
        ("Français", "book"),
        ("Histoire-Géographie", "globe"),
        ("Anglais", "language"),
        ("Espagnol / Arabe", "language"),
        ("Latin / Grec", "book"),
    ],
    "sen_scientifique": [
        ("Mathématiques", "calculator"),
        ("Sciences Physiques", "atom"),
        ("Sciences de la Vie et de la Terre", "leaf"),
        ("Français", "book"),
        ("Philosophie", "brain"),
        ("Anglais", "language"),
    ],
    "sen_tertiaire": [
        ("Comptabilité", "calculator"),
        ("Économie d'Entreprise", "chart"),
        ("Droit", "scale"),
        ("Mathématiques", "calculator"),
        ("Français", "book"),
    ],
    "sen_technique": [
        ("Mathématiques", "calculator"),
        ("Sciences Physiques", "atom"),
        ("Technologie", "wrench"),
        ("Français", "book"),
        ("Anglais", "language"),
    ],
    # ---- Burkina Faso ----
    "bfa_generale": [
        ("Mathématiques", "calculator"),
        ("Physique-Chimie", "atom"),
        ("SVT", "leaf"),
        ("Français", "book"),
        ("Philosophie", "brain"),
        ("Histoire-Géographie", "globe"),
        ("Anglais", "language"),
    ],
    "bfa_industrielle": [
        ("Mathématiques", "calculator"),
        ("Physique Appliquée", "bolt"),
        ("Technologie", "wrench"),
        ("Français", "book"),
    ],
    "bfa_tertiaire": [
        ("Comptabilité", "calculator"),
        ("Économie", "chart"),
        ("Droit", "scale"),
        ("Français", "book"),
        ("Anglais", "language"),
    ],
    "bfa_hotellerie": [
        ("Techniques Hôtelières", "wrench"),
        ("Mathématiques", "calculator"),
        ("Français", "book"),
        ("Anglais", "language"),
    ],
    # ---- Mali ----
    "mli_litteraire": [
        ("Philosophie", "brain"),
        ("Lettres", "book"),
        ("Histoire-Géographie", "globe"),
        ("Anglais", "language"),
        ("Arabe", "language"),
    ],
    "mli_scientifique": [
        ("Mathématiques", "calculator"),
        ("Physique-Chimie", "atom"),
        ("Biologie", "leaf"),
        ("Français", "book"),
        ("Anglais", "language"),
    ],
    "mli_economique": [
        ("Économie", "chart"),
        ("Comptabilité", "calculator"),
        ("Mathématiques", "calculator"),
        ("Français", "book"),
        ("Histoire-Géographie", "globe"),
    ],
}

SERVICES = [
    {"id": "early", "title": "Recevoir les copies corrigées avant le jour J", "subtitle": "Toutes les épreuves corrigées remises avant le matin de l'examen", "icon": "calendar-check", "mode": "platform"},
    {"id": "realtime", "title": "Corrections en temps réel le jour J", "subtitle": "Notre équipe traite et vous renvoie les corrections en direct", "icon": "clock", "mode": "platform"},
    {"id": "accomplice", "title": "Complice à l'intérieur de l'école", "subtitle": "Un complice sur place vous remet un téléphone pour recevoir les corrections", "icon": "user-shield", "mode": "whatsapp"},
    {"id": "modification", "title": "Modification des notes", "subtitle": "Correction et modification de vos notes à la délibération", "icon": "edit", "mode": "whatsapp"},
    {"id": "other", "title": "Autre service personnalisé", "subtitle": "Discutez directement avec notre équipe sur WhatsApp", "icon": "message", "mode": "whatsapp"},
]


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"app": "Mon Exam", "status": "ok"}


@api_router.get("/config")
async def get_config(country: str = "civ"):
    country = country.lower()
    series = SERIES_BY_COUNTRY.get(country, SERIES_BY_COUNTRY["civ"])
    return {
        "countries": COUNTRIES,
        "series": series,
        "services": SERVICES,
        "wave_number": WAVE_NUMBER,
        "orange_number": ORANGE_NUMBER,
        "whatsapp_link": WHATSAPP_LINK,
        "payment_window_min": PAYMENT_WINDOW_MIN,
        "pricing": {"single": PRICE_SINGLE, "pack5": PRICE_PACK5, "exam": PRICE_EXAM, "pack6": PRICE_PACK6},
    }


@api_router.post("/session/init", response_model=SessionOut)
async def session_init(body: SessionInit):
    user_id = gen_session_id()
    doc = {
        "user_id": user_id,
        "country_code": body.country_code,
        "created_at": now_utc(),
    }
    await db.sessions.insert_one(doc)
    return SessionOut(user_id=user_id, country_code=body.country_code, created_at=to_iso(doc["created_at"]))


def _slugify(s: str) -> str:
    repl = {"é": "e", "è": "e", "ê": "e", "à": "a", "â": "a", "ô": "o", "ç": "c", "î": "i", "ï": "i", "'": "", "/": "-"}
    out = s.lower()
    for k, v in repl.items():
        out = out.replace(k, v)
    return "-".join(out.split())


@api_router.get("/subjects")
async def list_subjects(series: str, sub_series: str, country: str = "civ"):
    key = f"{country}_{series}"
    raw = SUBJECTS_BY_SERIES.get(key, [])
    result = []
    for name, icon in raw:
        result.append({
            "id": f"{country}-{series}-{_slugify(name)}",
            "name": name,
            "series": series,
            "sub_series": sub_series,
            "country": country,
            "icon": icon,
            "description": f"Sujet officiel BAC {country.upper()} — {name}",
            "year": "2026",
        })
    return {"subjects": result, "count": len(result)}


def _compute_amount(pack: str, items: List[CartItemIn]) -> int:
    n = len(items)
    if pack == "single":
        return PRICE_SINGLE * n
    if pack == "exam":
        return PRICE_EXAM * n
    if pack == "pack5":
        return PRICE_PACK5
    if pack == "pack6":
        return PRICE_PACK6
    return PRICE_SINGLE * n


@api_router.post("/checkout")
async def checkout(body: CheckoutIn):
    sess = await db.sessions.find_one({"user_id": body.user_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Session invalide")
    if not body.items:
        raise HTTPException(status_code=400, detail="Panier vide")
    amount = _compute_amount(body.pack, body.items)
    order_id = gen_order_id()
    activation_code = gen_activation_code()
    internal_token = gen_internal_token()  # Server-only secret, never returned to client
    salt = secrets.token_hex(8)
    code_hash = hash_code(activation_code, body.user_id, salt)
    created = now_utc()
    expires = created + timedelta(minutes=PAYMENT_WINDOW_MIN)
    payment_number = WAVE_NUMBER if body.payment_method == "wave" else ORANGE_NUMBER
    doc = {
        "order_id": order_id,
        "user_id": body.user_id,
        "phone": body.phone,
        "items": [i.model_dump() for i in body.items],
        "service": body.service,
        "pack": body.pack,
        "country_code": body.country_code,
        "amount": amount,
        "currency": "XOF",
        "payment_method": body.payment_method,
        "payment_number": payment_number,
        # Two distinct codes:
        "activation_code": activation_code,   # user-facing (8 chars)
        "internal_token": internal_token,     # server-only (32 hex)
        "code_salt": salt,
        "code_hash": code_hash,
        "status": "pending",
        "created_at": created,
        "expires_at": expires,
        "used": False,
    }
    await db.orders.insert_one(doc)
    # Only return what client needs — internal_token, code_hash, code_salt stay server-side
    return {
        "order_id": order_id,
        "activation_code": activation_code,
        "amount": amount,
        "currency": "XOF",
        "expires_at": to_iso(expires),
        "status": "pending",
        "payment_method": body.payment_method,
        "payment_number": payment_number,
        "items": doc["items"],
        "service": body.service,
        "pack": body.pack,
        "created_at": to_iso(created),
        "seconds_remaining": PAYMENT_WINDOW_MIN * 60,
    }


@api_router.get("/order/{order_id}")
async def get_order(order_id: str, user_id: str):
    o = await db.orders.find_one(
        {"order_id": order_id, "user_id": user_id},
        {"_id": 0, "internal_token": 0, "code_hash": 0, "code_salt": 0},
    )
    if not o:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    expires = o["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    remaining = max(0, int((expires - now_utc()).total_seconds()))
    if remaining == 0 and o["status"] == "pending":
        await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "expired"}})
        o["status"] = "expired"
    o["seconds_remaining"] = remaining
    o["expires_at"] = to_iso(expires)
    if isinstance(o.get("created_at"), datetime):
        o["created_at"] = to_iso(o["created_at"])
    return o


@api_router.post("/payment/simulate")
async def simulate_payment(body: SimulatePay):
    o = await db.orders.find_one({"order_id": body.order_id, "user_id": body.user_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    # Verify activation code via hash (bound to user_id + salt)
    expected_hash = hash_code(body.activation_code.upper(), body.user_id, o["code_salt"])
    if expected_hash != o["code_hash"]:
        raise HTTPException(status_code=400, detail="Code d'activation incorrect")
    if o["used"]:
        raise HTTPException(status_code=400, detail="Code déjà utilisé")
    expires = o["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now_utc() > expires:
        await db.orders.update_one({"order_id": body.order_id}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Délai expiré, recommencez")
    await db.orders.update_one(
        {"order_id": body.order_id},
        {"$set": {"status": "awaiting_validation", "txn_ref": body.txn_ref, "submitted_at": now_utc()}},
    )
    return {"ok": True, "status": "awaiting_validation", "message": "Paiement soumis. En attente de validation par notre équipe."}


@api_router.get("/purchases")
async def get_purchases(user_id: str):
    cursor = db.orders.find(
        {"user_id": user_id, "status": {"$in": ["paid", "awaiting_validation", "refused"]}},
        {"_id": 0, "internal_token": 0, "code_hash": 0, "code_salt": 0},
    ).sort("created_at", -1)
    out = []
    async for o in cursor:
        for k in ("created_at", "expires_at", "submitted_at", "validated_at"):
            if isinstance(o.get(k), datetime):
                o[k] = to_iso(o[k])
        out.append(o)
    return {"purchases": out, "count": len(out)}


@api_router.delete("/order/{order_id}")
async def delete_order(order_id: str, user_id: str):
    """User can delete their own pending/refused/expired orders."""
    o = await db.orders.find_one({"order_id": order_id, "user_id": user_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if o["status"] == "paid":
        raise HTTPException(status_code=400, detail="Impossible de supprimer une commande payée")
    await db.orders.delete_one({"order_id": order_id, "user_id": user_id})
    return {"ok": True}


# ---------- Admin ----------
@api_router.post("/admin/login")
async def admin_login(body: AdminLogin, request: Request):
    ip = request.client.host if request.client else "unknown"
    # Rate limit: max 5 attempts per IP per 10 minutes
    window_start = now_utc() - timedelta(minutes=10)
    attempts = await db.admin_attempts.count_documents({"ip": ip, "at": {"$gte": window_start}, "ok": False})
    if attempts >= 5:
        await db.admin_attempts.insert_one({"ip": ip, "at": now_utc(), "ok": False, "blocked": True})
        raise HTTPException(status_code=429, detail="Trop de tentatives, réessayez dans 10 minutes.")
    ok = body.code == ADMIN_CODE
    await db.admin_attempts.insert_one({"ip": ip, "at": now_utc(), "ok": ok})
    if not ok:
        raise HTTPException(status_code=401, detail="Code admin incorrect")
    token = secrets.token_urlsafe(24)
    await db.admin_sessions.insert_one({"token": token, "created_at": now_utc(), "ip": ip})
    return {"token": token}


async def _verify_admin_token(token: Optional[str]):
    if not token:
        raise HTTPException(status_code=401, detail="Token manquant")
    s = await db.admin_sessions.find_one({"token": token}, {"_id": 0, "created_at": 1})
    if not s:
        raise HTTPException(status_code=401, detail="Session admin invalide")
    # 6h expiry
    created = s["created_at"]
    if isinstance(created, datetime):
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if now_utc() - created > timedelta(hours=6):
            raise HTTPException(status_code=401, detail="Session admin expirée")


@api_router.get("/admin/orders")
async def admin_orders(x_admin_session: Optional[str] = Header(default=None)):
    await _verify_admin_token(x_admin_session)
    cursor = db.orders.find(
        {},
        {"_id": 0, "internal_token": 0, "code_hash": 0, "code_salt": 0},
    ).sort("created_at", -1).limit(200)
    out = []
    counts = {"pending": 0, "awaiting_validation": 0, "paid": 0, "refused": 0, "expired": 0}
    async for o in cursor:
        for k in ("created_at", "expires_at", "submitted_at", "validated_at"):
            if isinstance(o.get(k), datetime):
                o[k] = to_iso(o[k])
        st = o.get("status", "pending")
        if st in counts:
            counts[st] += 1
        out.append(o)
    return {"orders": out, "counts": counts}


@api_router.post("/admin/action")
async def admin_action(body: AdminAction, x_admin_session: Optional[str] = Header(default=None)):
    await _verify_admin_token(x_admin_session)
    o = await db.orders.find_one({"order_id": body.order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if body.action == "accept":
        await db.orders.update_one(
            {"order_id": body.order_id},
            {"$set": {"status": "paid", "used": True, "validated_at": now_utc()}},
        )
    elif body.action == "refuse":
        await db.orders.update_one(
            {"order_id": body.order_id},
            {"$set": {"status": "refused", "refused_at": now_utc()}},
        )
    elif body.action == "delete":
        await db.orders.delete_one({"order_id": body.order_id})
    return {"ok": True}


# Real-time notifications (polling endpoint — counts unread)
@api_router.get("/notifications")
async def notifications(user_id: str):
    """Returns recent updates for the user since last check."""
    cursor = db.orders.find(
        {"user_id": user_id, "status": {"$in": ["paid", "refused", "awaiting_validation"]}},
        {"_id": 0, "order_id": 1, "status": 1, "validated_at": 1, "refused_at": 1, "submitted_at": 1, "amount": 1, "service": 1},
    ).sort("created_at", -1).limit(10)
    items = []
    async for o in cursor:
        for k in ("validated_at", "refused_at", "submitted_at"):
            if isinstance(o.get(k), datetime):
                o[k] = to_iso(o[k])
        items.append(o)
    return {"notifications": items}


# ---------- Background cleanup ----------
async def cleanup_expired():
    while True:
        try:
            await db.orders.update_many(
                {"status": "pending", "expires_at": {"$lt": now_utc()}},
                {"$set": {"status": "expired"}},
            )
            # cleanup old admin sessions
            await db.admin_sessions.delete_many(
                {"created_at": {"$lt": now_utc() - timedelta(hours=6)}}
            )
        except Exception as e:
            logging.warning(f"cleanup error: {e}")
        await asyncio.sleep(60)


@app.on_event("startup")
async def startup():
    await db.sessions.create_index("user_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.admin_sessions.create_index("token", unique=True)
    asyncio.create_task(cleanup_expired())


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
