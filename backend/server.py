from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Mon Exam API")
api_router = APIRouter(prefix="/api")

# Static constants
ADMIN_TOKEN = "monexam-admin-2026"
WAVE_NUMBER = "+225 05 45 01 94 93"
ORANGE_NUMBER = "+225 07 48 11 10 50"
WHATSAPP_LINK = "https://wa.me/2250545019493"
PAYMENT_WINDOW_MIN = 5

PRICE_SINGLE = 8000  # real-time correction single subject
PRICE_PACK5 = 35000  # real-time pack 5 subjects
PRICE_EXAM = 13000  # subject + exam paper
PRICE_PACK6 = 50000  # 6 subjects (exam + correction)


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(d: datetime) -> str:
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.isoformat()


def gen_session_id() -> str:
    # Fresh anonymous user/session id every login
    return f"MEX-{secrets.token_urlsafe(12)}"


def gen_activation_code() -> str:
    # 8 char alphanumeric, uppercase, no ambiguity
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def check_admin(token: Optional[str]):
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------- Pydantic Models ----------
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


class Subject(BaseModel):
    id: str
    name: str
    series: str  # generale | industrielle | tertiaire
    sub_series: str  # A1, A2, C, D, E, F1..F8, G1..G3
    description: str
    icon: str  # name from emoji or label


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

    @field_validator("phone")
    @classmethod
    def phone_check(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 8 or len(digits) > 15:
            raise ValueError("invalid phone")
        return v.strip()


class OrderOut(BaseModel):
    order_id: str
    activation_code: str
    amount: int
    currency: str
    expires_at: str
    status: str
    payment_method: str
    payment_number: str
    items: List[dict]
    service: str
    pack: str
    created_at: str
    seconds_remaining: int


class SimulatePay(BaseModel):
    order_id: str
    user_id: str
    txn_ref: str
    activation_code: str


class AdminValidateIn(BaseModel):
    order_id: str


# ---------- Seed data ----------
DEFAULT_SUBJECTS = [
    # Generale
    {"name": "Mathématiques", "series": "generale", "icon": "calculator"},
    {"name": "Physique-Chimie", "series": "generale", "icon": "atom"},
    {"name": "Sciences de la Vie et de la Terre", "series": "generale", "icon": "leaf"},
    {"name": "Français", "series": "generale", "icon": "book"},
    {"name": "Philosophie", "series": "generale", "icon": "brain"},
    {"name": "Histoire-Géographie", "series": "generale", "icon": "globe"},
    {"name": "Anglais", "series": "generale", "icon": "language"},
    {"name": "Espagnol", "series": "generale", "icon": "language"},
    # Industrielle F
    {"name": "Mathématiques", "series": "industrielle", "icon": "calculator"},
    {"name": "Physique Appliquée", "series": "industrielle", "icon": "bolt"},
    {"name": "Construction Mécanique", "series": "industrielle", "icon": "gear"},
    {"name": "Électrotechnique", "series": "industrielle", "icon": "plug"},
    {"name": "Technologie", "series": "industrielle", "icon": "wrench"},
    {"name": "Français", "series": "industrielle", "icon": "book"},
    # Tertiaire G
    {"name": "Économie", "series": "tertiaire", "icon": "chart"},
    {"name": "Comptabilité", "series": "tertiaire", "icon": "calculator"},
    {"name": "Droit", "series": "tertiaire", "icon": "scale"},
    {"name": "Mathématiques Financières", "series": "tertiaire", "icon": "chart"},
    {"name": "Français", "series": "tertiaire", "icon": "book"},
    {"name": "Anglais", "series": "tertiaire", "icon": "language"},
]

SERIES_STRUCTURE = {
    "generale": {
        "label": "Série Générale",
        "description": "Bac général littéraire et scientifique",
        "color": "#16A34A",
        "sub_series": ["A1", "A2", "C", "D", "E"],
    },
    "industrielle": {
        "label": "Série F — Industrielle",
        "description": "Bac technique industriel",
        "color": "#EA580C",
        "sub_series": ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"],
    },
    "tertiaire": {
        "label": "Série G — Gestion / Tertiaire",
        "description": "Bac technique gestion",
        "color": "#1C449E",
        "sub_series": ["G1", "G2", "G3"],
    },
}

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

SERVICES = [
    {
        "id": "early",
        "title": "Recevoir les copies corrigées avant le jour J",
        "subtitle": "Toutes les épreuves corrigées remises avant le matin de l'examen",
        "icon": "calendar-check",
        "mode": "platform",
    },
    {
        "id": "realtime",
        "title": "Corrections en temps réel le jour J",
        "subtitle": "Notre équipe traite et vous renvoie les corrections en direct via WhatsApp",
        "icon": "clock",
        "mode": "platform",
    },
    {
        "id": "accomplice",
        "title": "Complice à l'intérieur de l'école",
        "subtitle": "Un complice sur place vous remet un téléphone pour recevoir les corrections",
        "icon": "user-shield",
        "mode": "whatsapp",
    },
    {
        "id": "modification",
        "title": "Modification des notes",
        "subtitle": "Correction et modification de vos notes à la délibération",
        "icon": "edit",
        "mode": "whatsapp",
    },
    {
        "id": "other",
        "title": "Autre service personnalisé",
        "subtitle": "Discutez directement avec notre équipe sur WhatsApp",
        "icon": "message",
        "mode": "whatsapp",
    },
]


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"app": "Mon Exam", "status": "ok"}


@api_router.get("/config")
async def get_config():
    return {
        "countries": COUNTRIES,
        "series": SERIES_STRUCTURE,
        "services": SERVICES,
        "wave_number": WAVE_NUMBER,
        "orange_number": ORANGE_NUMBER,
        "whatsapp_link": WHATSAPP_LINK,
        "payment_window_min": PAYMENT_WINDOW_MIN,
        "pricing": {
            "single": PRICE_SINGLE,
            "pack5": PRICE_PACK5,
            "exam": PRICE_EXAM,
            "pack6": PRICE_PACK6,
        },
    }


@api_router.post("/session/init", response_model=SessionOut)
async def session_init(body: SessionInit):
    user_id = gen_session_id()
    doc = {
        "user_id": user_id,
        "country_code": body.country_code,
        "created_at": now_utc(),
        "ip": None,
    }
    await db.sessions.insert_one(doc)
    return SessionOut(
        user_id=user_id, country_code=body.country_code, created_at=to_iso(doc["created_at"])
    )


@api_router.get("/subjects")
async def list_subjects(series: str, sub_series: Optional[str] = None):
    if series not in SERIES_STRUCTURE:
        raise HTTPException(status_code=400, detail="invalid series")
    subs = [s for s in DEFAULT_SUBJECTS if s["series"] == series]
    # Pull custom subjects from DB too
    cursor = db.custom_subjects.find({"series": series}, {"_id": 0})
    async for c in cursor:
        subs.append(c)
    result = []
    for s in subs:
        if sub_series and s.get("sub_series") and s["sub_series"] != sub_series:
            continue
        result.append({
            "id": f"{series}-{s['name']}".lower().replace(" ", "-").replace("é", "e").replace("è", "e").replace("à", "a"),
            "name": s["name"],
            "series": series,
            "sub_series": sub_series or s.get("sub_series", ""),
            "icon": s.get("icon", "book"),
            "description": s.get("description", f"Sujet officiel BAC — {s['name']}"),
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


@api_router.post("/checkout", response_model=OrderOut)
async def checkout(body: CheckoutIn):
    # Validate user session
    sess = await db.sessions.find_one({"user_id": body.user_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Session invalide")
    if not body.items:
        raise HTTPException(status_code=400, detail="Panier vide")
    amount = _compute_amount(body.pack, body.items)
    order_id = f"ORD-{secrets.token_urlsafe(8).upper()}"
    code = gen_activation_code()
    created = now_utc()
    expires = created + timedelta(minutes=PAYMENT_WINDOW_MIN)
    payment_number = WAVE_NUMBER if body.payment_method == "wave" else "Numéro indisponible"
    doc = {
        "order_id": order_id,
        "user_id": body.user_id,
        "phone": body.phone,
        "items": [i.model_dump() for i in body.items],
        "service": body.service,
        "pack": body.pack,
        "amount": amount,
        "currency": "XOF",
        "payment_method": body.payment_method,
        "payment_number": payment_number,
        "activation_code": code,
        "status": "pending",
        "created_at": created,
        "expires_at": expires,
        "used": False,
    }
    await db.orders.insert_one(doc)
    return OrderOut(
        order_id=order_id,
        activation_code=code,
        amount=amount,
        currency="XOF",
        expires_at=to_iso(expires),
        status="pending",
        payment_method=body.payment_method,
        payment_number=payment_number,
        items=doc["items"],
        service=body.service,
        pack=body.pack,
        created_at=to_iso(created),
        seconds_remaining=PAYMENT_WINDOW_MIN * 60,
    )


@api_router.get("/order/{order_id}")
async def get_order(order_id: str, user_id: str):
    o = await db.orders.find_one({"order_id": order_id, "user_id": user_id}, {"_id": 0})
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
    if o["activation_code"] != body.activation_code:
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
    # Mark waiting_validation (admin will approve)
    await db.orders.update_one(
        {"order_id": body.order_id},
        {"$set": {"status": "awaiting_validation", "txn_ref": body.txn_ref, "submitted_at": now_utc()}},
    )
    return {"ok": True, "status": "awaiting_validation", "message": "Paiement soumis. Vous recevrez l'accès dès validation."}


@api_router.get("/purchases")
async def get_purchases(user_id: str):
    cursor = db.orders.find(
        {"user_id": user_id, "status": {"$in": ["paid", "awaiting_validation"]}},
        {"_id": 0},
    ).sort("created_at", -1)
    out = []
    async for o in cursor:
        if isinstance(o.get("created_at"), datetime):
            o["created_at"] = to_iso(o["created_at"])
        if isinstance(o.get("expires_at"), datetime):
            o["expires_at"] = to_iso(o["expires_at"])
        if isinstance(o.get("submitted_at"), datetime):
            o["submitted_at"] = to_iso(o["submitted_at"])
        out.append(o)
    return {"purchases": out, "count": len(out)}


# ---------- Admin ----------
@api_router.post("/admin/validate")
async def admin_validate(body: AdminValidateIn, x_admin_token: Optional[str] = Header(default=None)):
    check_admin(x_admin_token)
    o = await db.orders.find_one({"order_id": body.order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    await db.orders.update_one(
        {"order_id": body.order_id},
        {"$set": {"status": "paid", "used": True, "validated_at": now_utc()}},
    )
    return {"ok": True}


@api_router.get("/admin/orders")
async def admin_orders(x_admin_token: Optional[str] = Header(default=None)):
    check_admin(x_admin_token)
    cursor = db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(100)
    out = []
    async for o in cursor:
        for k in ("created_at", "expires_at", "submitted_at", "validated_at"):
            if isinstance(o.get(k), datetime):
                o[k] = to_iso(o[k])
        out.append(o)
    return {"orders": out}


# ---------- Background cleanup ----------
async def cleanup_expired():
    while True:
        try:
            await db.orders.update_many(
                {"status": "pending", "expires_at": {"$lt": now_utc()}},
                {"$set": {"status": "expired"}},
            )
        except Exception as e:
            logging.warning(f"cleanup error: {e}")
        await asyncio.sleep(60)


@app.on_event("startup")
async def startup():
    await db.sessions.create_index("user_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
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
