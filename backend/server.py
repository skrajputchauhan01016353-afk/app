from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Coaching LMS API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BatchIn(BaseModel):
    name: str
    description: str = ""
    cover_url: Optional[str] = None
    target_exam: Optional[str] = None
    year: Optional[int] = None


class SubjectIn(BaseModel):
    batch_id: str
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    cover_url: Optional[str] = None


class ChapterIn(BaseModel):
    subject_id: str
    name: str
    order: int = 0


class VideoIn(BaseModel):
    chapter_id: str
    title: str
    description: str = ""
    url: str
    duration_seconds: int = 0
    order: int = 0


class NoteIn(BaseModel):
    chapter_id: str
    title: str
    url: str
    description: str = ""


class QuestionIn(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str = ""


class TestIn(BaseModel):
    chapter_id: str
    title: str
    description: str = ""
    duration_minutes: int = 10
    questions: List[QuestionIn]


class LiveClassIn(BaseModel):
    title: str
    batch_id: str
    subject_id: Optional[str] = None
    youtube_url: str
    start_time: str
    description: str = ""


class EnrollIn(BaseModel):
    student_id: str
    batch_id: str


class WatchProgressIn(BaseModel):
    video_id: str
    position_seconds: int
    duration_seconds: int


class TestSubmitAnswer(BaseModel):
    question_index: int
    selected_index: int


class TestSubmitIn(BaseModel):
    test_id: str
    answers: List[TestSubmitAnswer]
    time_taken_seconds: int = 0


# ---------- Auth dep ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": "student",
        "avatar_url": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Batches ----------
@api.get("/batches")
async def list_batches(user: dict = Depends(get_current_user)):
    return await db.batches.find({}, {"_id": 0}).to_list(1000)


@api.post("/batches")
async def create_batch(body: BatchIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.batches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/batches/{batch_id}")
async def update_batch(batch_id: str, body: BatchIn, user: dict = Depends(require_admin)):
    await db.batches.update_one({"id": batch_id}, {"$set": body.model_dump()})
    return await db.batches.find_one({"id": batch_id}, {"_id": 0})


@api.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(require_admin)):
    subject_ids = [s["id"] async for s in db.subjects.find({"batch_id": batch_id})]
    chapter_ids = [c["id"] async for c in db.chapters.find({"subject_id": {"$in": subject_ids}})]
    await db.batches.delete_one({"id": batch_id})
    await db.subjects.delete_many({"batch_id": batch_id})
    await db.chapters.delete_many({"subject_id": {"$in": subject_ids}})
    await db.videos.delete_many({"chapter_id": {"$in": chapter_ids}})
    await db.notes.delete_many({"chapter_id": {"$in": chapter_ids}})
    await db.tests.delete_many({"chapter_id": {"$in": chapter_ids}})
    await db.enrollments.delete_many({"batch_id": batch_id})
    return {"ok": True}


@api.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    b = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    return b


# ---------- Subjects ----------
@api.get("/subjects")
async def list_subjects(batch_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"batch_id": batch_id} if batch_id else {}
    return await db.subjects.find(q, {"_id": 0}).to_list(1000)


@api.post("/subjects")
async def create_subject(body: SubjectIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/subjects/{subject_id}")
async def update_subject(subject_id: str, body: SubjectIn, user: dict = Depends(require_admin)):
    await db.subjects.update_one({"id": subject_id}, {"$set": body.model_dump()})
    return await db.subjects.find_one({"id": subject_id}, {"_id": 0})


@api.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(require_admin)):
    chapter_ids = [c["id"] async for c in db.chapters.find({"subject_id": subject_id})]
    await db.subjects.delete_one({"id": subject_id})
    await db.chapters.delete_many({"subject_id": subject_id})
    await db.videos.delete_many({"chapter_id": {"$in": chapter_ids}})
    await db.notes.delete_many({"chapter_id": {"$in": chapter_ids}})
    await db.tests.delete_many({"chapter_id": {"$in": chapter_ids}})
    return {"ok": True}


@api.get("/subjects/{subject_id}")
async def get_subject(subject_id: str, user: dict = Depends(get_current_user)):
    s = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    return s


# ---------- Chapters ----------
@api.get("/chapters")
async def list_chapters(subject_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"subject_id": subject_id} if subject_id else {}
    return await db.chapters.find(q, {"_id": 0}).sort("order", 1).to_list(1000)


@api.post("/chapters")
async def create_chapter(body: ChapterIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.chapters.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/chapters/{chapter_id}")
async def update_chapter(chapter_id: str, body: ChapterIn, user: dict = Depends(require_admin)):
    await db.chapters.update_one({"id": chapter_id}, {"$set": body.model_dump()})
    return await db.chapters.find_one({"id": chapter_id}, {"_id": 0})


@api.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str, user: dict = Depends(require_admin)):
    await db.chapters.delete_one({"id": chapter_id})
    await db.videos.delete_many({"chapter_id": chapter_id})
    await db.notes.delete_many({"chapter_id": chapter_id})
    await db.tests.delete_many({"chapter_id": chapter_id})
    return {"ok": True}


@api.get("/chapters/{chapter_id}")
async def get_chapter(chapter_id: str, user: dict = Depends(get_current_user)):
    c = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return c


# ---------- Videos ----------
@api.get("/videos")
async def list_videos(chapter_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"chapter_id": chapter_id} if chapter_id else {}
    return await db.videos.find(q, {"_id": 0}).sort("order", 1).to_list(1000)


@api.post("/videos")
async def create_video(body: VideoIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/videos/{video_id}")
async def update_video(video_id: str, body: VideoIn, user: dict = Depends(require_admin)):
    await db.videos.update_one({"id": video_id}, {"$set": body.model_dump()})
    return await db.videos.find_one({"id": video_id}, {"_id": 0})


@api.delete("/videos/{video_id}")
async def delete_video(video_id: str, user: dict = Depends(require_admin)):
    await db.videos.delete_one({"id": video_id})
    return {"ok": True}


@api.get("/videos/{video_id}")
async def get_video(video_id: str, user: dict = Depends(get_current_user)):
    v = await db.videos.find_one({"id": video_id}, {"_id": 0})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    return v


# ---------- Notes ----------
@api.get("/notes")
async def list_notes(chapter_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"chapter_id": chapter_id} if chapter_id else {}
    return await db.notes.find(q, {"_id": 0}).to_list(1000)


@api.post("/notes")
async def create_note(body: NoteIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/notes/{note_id}")
async def update_note(note_id: str, body: NoteIn, user: dict = Depends(require_admin)):
    await db.notes.update_one({"id": note_id}, {"$set": body.model_dump()})
    return await db.notes.find_one({"id": note_id}, {"_id": 0})


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(require_admin)):
    await db.notes.delete_one({"id": note_id})
    return {"ok": True}


# ---------- Tests / MCQ ----------
@api.get("/tests")
async def list_tests(chapter_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"chapter_id": chapter_id} if chapter_id else {}
    tests = await db.tests.find(q, {"_id": 0}).to_list(1000)
    if user.get("role") != "admin":
        for t in tests:
            for qd in t.get("questions", []):
                qd.pop("correct_index", None)
                qd.pop("explanation", None)
    return tests


# IMPORTANT: place more specific routes BEFORE /tests/{test_id}
@api.get("/tests/attempts/me")
async def my_attempts(user: dict = Depends(get_current_user)):
    return await db.test_attempts.find({"user_id": user["id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)


@api.post("/tests/submit")
async def submit_test(body: TestSubmitIn, user: dict = Depends(get_current_user)):
    test = await db.tests.find_one({"id": body.test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    questions = test.get("questions", [])
    total = len(questions)
    correct = 0
    breakdown = []
    answer_map = {a.question_index: a.selected_index for a in body.answers}
    for idx, q in enumerate(questions):
        selected = answer_map.get(idx, -1)
        is_correct = selected == q["correct_index"]
        if is_correct:
            correct += 1
        breakdown.append(
            {
                "question": q["question"],
                "options": q["options"],
                "correct_index": q["correct_index"],
                "selected_index": selected,
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )
    score_pct = round((correct / total) * 100, 2) if total else 0
    attempt = {
        "id": new_id(),
        "test_id": body.test_id,
        "user_id": user["id"],
        "score": correct,
        "total": total,
        "score_pct": score_pct,
        "time_taken_seconds": body.time_taken_seconds,
        "submitted_at": now_iso(),
    }
    await db.test_attempts.insert_one(attempt)
    attempt.pop("_id", None)
    return {**attempt, "breakdown": breakdown, "test_title": test.get("title")}


@api.get("/tests/{test_id}")
async def get_test(test_id: str, user: dict = Depends(get_current_user)):
    t = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    if user.get("role") != "admin":
        for qd in t.get("questions", []):
            qd.pop("correct_index", None)
            qd.pop("explanation", None)
    return t


@api.post("/tests")
async def create_test(body: TestIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.tests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/tests/{test_id}")
async def update_test(test_id: str, body: TestIn, user: dict = Depends(require_admin)):
    await db.tests.update_one({"id": test_id}, {"$set": body.model_dump()})
    return await db.tests.find_one({"id": test_id}, {"_id": 0})


@api.delete("/tests/{test_id}")
async def delete_test(test_id: str, user: dict = Depends(require_admin)):
    await db.tests.delete_one({"id": test_id})
    await db.test_attempts.delete_many({"test_id": test_id})
    return {"ok": True}


# ---------- Live Classes ----------
def _compute_status(item: dict) -> str:
    try:
        start = datetime.fromisoformat(item["start_time"].replace("Z", "+00:00"))
        diff = (start - datetime.now(timezone.utc)).total_seconds()
        if diff > 60 * 15:
            return "upcoming"
        if -60 * 60 * 2 <= diff <= 60 * 15:
            return "live"
        return "ended"
    except Exception:
        return "upcoming"


@api.get("/live-classes")
async def list_live_classes(batch_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"batch_id": batch_id} if batch_id else {}
    items = await db.live_classes.find(q, {"_id": 0}).sort("start_time", 1).to_list(1000)
    for it in items:
        it["status"] = _compute_status(it)
    return items


@api.post("/live-classes")
async def create_live_class(body: LiveClassIn, user: dict = Depends(require_admin)):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.live_classes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/live-classes/{lc_id}")
async def update_live_class(lc_id: str, body: LiveClassIn, user: dict = Depends(require_admin)):
    await db.live_classes.update_one({"id": lc_id}, {"$set": body.model_dump()})
    return await db.live_classes.find_one({"id": lc_id}, {"_id": 0})


@api.delete("/live-classes/{lc_id}")
async def delete_live_class(lc_id: str, user: dict = Depends(require_admin)):
    await db.live_classes.delete_one({"id": lc_id})
    return {"ok": True}


# ---------- Enrollments ----------
@api.get("/enrollments/me")
async def my_enrollments(user: dict = Depends(get_current_user)):
    enrolls = await db.enrollments.find({"student_id": user["id"]}, {"_id": 0}).to_list(1000)
    batch_ids = [e["batch_id"] for e in enrolls]
    return await db.batches.find({"id": {"$in": batch_ids}}, {"_id": 0}).to_list(1000)


@api.post("/enrollments")
async def enroll(body: EnrollIn, user: dict = Depends(require_admin)):
    existing = await db.enrollments.find_one({"student_id": body.student_id, "batch_id": body.batch_id})
    if existing:
        return {"ok": True, "already": True}
    doc = {"id": new_id(), **body.model_dump(), "enrolled_at": now_iso()}
    await db.enrollments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/enrollments/self/{batch_id}")
async def self_enroll(batch_id: str, user: dict = Depends(get_current_user)):
    existing = await db.enrollments.find_one({"student_id": user["id"], "batch_id": batch_id})
    if existing:
        return {"ok": True, "already": True}
    doc = {"id": new_id(), "student_id": user["id"], "batch_id": batch_id, "enrolled_at": now_iso()}
    await db.enrollments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/enrollments")
async def list_enrollments(batch_id: Optional[str] = None, user: dict = Depends(require_admin)):
    q = {"batch_id": batch_id} if batch_id else {}
    return await db.enrollments.find(q, {"_id": 0}).to_list(2000)


# ---------- Students ----------
@api.get("/students")
async def list_students(user: dict = Depends(require_admin)):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(2000)
    for s in students:
        s["enrollment_count"] = await db.enrollments.count_documents({"student_id": s["id"]})
    return students


# ---------- Watch progress ----------
@api.post("/progress")
async def update_progress(body: WatchProgressIn, user: dict = Depends(get_current_user)):
    key = {"user_id": user["id"], "video_id": body.video_id}
    update = {
        **key,
        "position_seconds": body.position_seconds,
        "duration_seconds": body.duration_seconds,
        "updated_at": now_iso(),
    }
    await db.progress.update_one(key, {"$set": update}, upsert=True)
    return {"ok": True}


@api.get("/progress/me")
async def my_progress(user: dict = Depends(get_current_user)):
    return await db.progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)


@api.get("/progress/continue-watching")
async def continue_watching(user: dict = Depends(get_current_user)):
    items = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(10)
    out = []
    for p in items:
        v = await db.videos.find_one({"id": p["video_id"]}, {"_id": 0})
        if not v:
            continue
        ch = await db.chapters.find_one({"id": v["chapter_id"]}, {"_id": 0})
        sub = await db.subjects.find_one({"id": ch["subject_id"]}, {"_id": 0}) if ch else None
        out.append({**p, "video": v, "chapter": ch, "subject": sub})
    return out


# ---------- Dashboards ----------
@api.get("/dashboard/student")
async def student_dashboard(user: dict = Depends(get_current_user)):
    enrolls = await db.enrollments.find({"student_id": user["id"]}, {"_id": 0}).to_list(100)
    batch_ids = [e["batch_id"] for e in enrolls]
    batches = await db.batches.find({"id": {"$in": batch_ids}}, {"_id": 0}).to_list(100)
    subjects = await db.subjects.find({"batch_id": {"$in": batch_ids}}, {"_id": 0}).to_list(200)
    chapter_ids = [c["id"] async for c in db.chapters.find({"subject_id": {"$in": [s["id"] for s in subjects]}})]
    latest_notes = (
        await db.notes.find({"chapter_id": {"$in": chapter_ids}}, {"_id": 0}).sort("created_at", -1).to_list(6)
    )
    latest_tests = (
        await db.tests.find({"chapter_id": {"$in": chapter_ids}}, {"_id": 0}).sort("created_at", -1).to_list(6)
    )
    for t in latest_tests:
        for q in t.get("questions", []):
            q.pop("correct_index", None)
            q.pop("explanation", None)
    live_raw = (
        await db.live_classes.find({"batch_id": {"$in": batch_ids}}, {"_id": 0}).sort("start_time", 1).to_list(50)
    )
    live_upcoming = []
    for it in live_raw:
        it["status"] = _compute_status(it)
        if it["status"] in ("upcoming", "live"):
            live_upcoming.append(it)
    return {
        "user": user,
        "batches": batches,
        "live_classes": live_upcoming[:10],
        "latest_notes": latest_notes,
        "latest_tests": latest_tests,
    }


@api.get("/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require_admin)):
    return {
        "counts": {
            "batches": await db.batches.count_documents({}),
            "subjects": await db.subjects.count_documents({}),
            "chapters": await db.chapters.count_documents({}),
            "videos": await db.videos.count_documents({}),
            "notes": await db.notes.count_documents({}),
            "tests": await db.tests.count_documents({}),
            "students": await db.users.count_documents({"role": "student"}),
            "live_classes": await db.live_classes.count_documents({}),
        }
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lms")


# ---------- Seed ----------
async def seed_users():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    student_email = os.environ["STUDENT_EMAIL"].lower()
    student_pw = os.environ["STUDENT_PASSWORD"]

    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one(
            {
                "id": new_id(),
                "email": admin_email,
                "name": "Admin",
                "password_hash": hash_password(admin_pw),
                "role": "admin",
                "avatar_url": "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80&w=200",
                "created_at": now_iso(),
            }
        )
    elif not verify_password(admin_pw, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    existing_student = await db.users.find_one({"email": student_email})
    if not existing_student:
        await db.users.insert_one(
            {
                "id": new_id(),
                "email": student_email,
                "name": "Aarav Sharma",
                "password_hash": hash_password(student_pw),
                "role": "student",
                "avatar_url": "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?auto=format&fit=crop&q=80&w=200",
                "created_at": now_iso(),
            }
        )
    elif not verify_password(student_pw, existing_student["password_hash"]):
        await db.users.update_one({"email": student_email}, {"$set": {"password_hash": hash_password(student_pw)}})


async def seed_content():
    if await db.batches.count_documents({}) > 0:
        return

    student = await db.users.find_one({"email": os.environ["STUDENT_EMAIL"].lower()})

    batches_data = [
        {
            "name": "NEET 2027 - Lakshya",
            "description": "Complete two-year course for NEET 2027 aspirants. Physics, Chemistry, Biology with full coverage.",
            "cover_url": "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=85&w=1200",
            "target_exam": "NEET",
            "year": 2027,
        },
        {
            "name": "JEE 2027 - Arjuna",
            "description": "Rigorous JEE Main + Advanced preparation. Physics, Chemistry, Mathematics.",
            "cover_url": "https://images.unsplash.com/photo-1635372722656-389f87a941b7?auto=format&fit=crop&q=85&w=1200",
            "target_exam": "JEE",
            "year": 2027,
        },
        {
            "name": "Class 10 Foundation",
            "description": "Strong fundamentals in Science and Mathematics for CBSE Class 10.",
            "cover_url": "https://images.pexels.com/photos/12732215/pexels-photo-12732215.jpeg?auto=format&fit=crop&q=85&w=1200",
            "target_exam": "CBSE",
            "year": 2026,
        },
    ]

    neet_subjects = [
        {"name": "Physics", "icon": "Atom", "color": "#1E3A8A", "cover_url": "https://images.unsplash.com/photo-1635372722656-389f87a941b7?auto=format&fit=crop&q=85&w=800"},
        {"name": "Chemistry", "icon": "FlaskConical", "color": "#16A34A", "cover_url": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&q=85&w=800"},
        {"name": "Biology", "icon": "Leaf", "color": "#C92A2A", "cover_url": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&q=85&w=800"},
    ]
    jee_subjects = [
        {"name": "Physics", "icon": "Atom", "color": "#1E3A8A", "cover_url": "https://images.unsplash.com/photo-1635372722656-389f87a941b7?auto=format&fit=crop&q=85&w=800"},
        {"name": "Chemistry", "icon": "FlaskConical", "color": "#16A34A", "cover_url": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&q=85&w=800"},
        {"name": "Mathematics", "icon": "Sigma", "color": "#F59E0B", "cover_url": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=85&w=800"},
    ]
    cbse_subjects = [
        {"name": "Science", "icon": "Microscope", "color": "#16A34A", "cover_url": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&q=85&w=800"},
        {"name": "Mathematics", "icon": "Sigma", "color": "#F59E0B", "cover_url": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=85&w=800"},
    ]

    chapters_map = {
        "Physics": ["Kinematics", "Laws of Motion", "Electricity & Magnetism", "Modern Physics"],
        "Chemistry": ["Atomic Structure", "Organic Chemistry Basics", "Chemical Bonding", "Thermodynamics"],
        "Biology": ["Cell Structure", "Human Physiology", "Genetics", "Plant Kingdom"],
        "Mathematics": ["Algebra", "Trigonometry", "Calculus", "Coordinate Geometry"],
        "Science": ["Light & Reflection", "Acids and Bases", "Life Processes", "Electricity"],
    }

    sample_videos = [
        {"title": "Introduction & Overview", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "duration_seconds": 720},
        {"title": "Core Concepts Explained", "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "duration_seconds": 1200},
        {"title": "Solved Examples", "url": "https://www.youtube.com/watch?v=9bZkp7q19f0", "duration_seconds": 980},
        {"title": "Practice Problems Walkthrough", "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk", "duration_seconds": 1500},
    ]

    sample_questions_pool = [
        {"question": "Which of the following is a vector quantity?", "options": ["Speed", "Velocity", "Mass", "Temperature"], "correct_index": 1, "explanation": "Velocity has both magnitude and direction."},
        {"question": "What is the SI unit of force?", "options": ["Joule", "Pascal", "Newton", "Watt"], "correct_index": 2, "explanation": "Force is measured in Newtons (N)."},
        {"question": "Which subatomic particle has no charge?", "options": ["Proton", "Neutron", "Electron", "Positron"], "correct_index": 1, "explanation": "Neutrons are electrically neutral."},
        {"question": "The derivative of sin(x) is:", "options": ["-cos(x)", "cos(x)", "-sin(x)", "tan(x)"], "correct_index": 1, "explanation": "d/dx[sin(x)] = cos(x)."},
        {"question": "What is the powerhouse of the cell?", "options": ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], "correct_index": 2, "explanation": "Mitochondria produce ATP."},
    ]

    for bdata in batches_data:
        b = {"id": new_id(), **bdata, "created_at": now_iso()}
        await db.batches.insert_one(dict(b))

        if "NEET" in b["name"]:
            sub_list = neet_subjects
        elif "JEE" in b["name"]:
            sub_list = jee_subjects
        else:
            sub_list = cbse_subjects

        for sdata in sub_list:
            sub = {"id": new_id(), "batch_id": b["id"], **sdata, "created_at": now_iso()}
            await db.subjects.insert_one(dict(sub))
            chapters = chapters_map.get(sdata["name"], ["Chapter 1", "Chapter 2", "Chapter 3"])
            for order, cname in enumerate(chapters):
                ch = {"id": new_id(), "subject_id": sub["id"], "name": cname, "order": order, "created_at": now_iso()}
                await db.chapters.insert_one(dict(ch))
                for vo, vd in enumerate(sample_videos):
                    await db.videos.insert_one(
                        {
                            "id": new_id(),
                            "chapter_id": ch["id"],
                            "title": f"{cname}: {vd['title']}",
                            "description": f"Lesson on {cname} — {vd['title']}.",
                            "url": vd["url"],
                            "duration_seconds": vd["duration_seconds"],
                            "order": vo,
                            "created_at": now_iso(),
                        }
                    )
                await db.notes.insert_one(
                    {
                        "id": new_id(),
                        "chapter_id": ch["id"],
                        "title": f"{cname} - Quick Revision Notes",
                        "description": "Concise notes covering all key formulas and concepts.",
                        "url": "https://www.africau.edu/images/default/sample.pdf",
                        "created_at": now_iso(),
                    }
                )
                await db.notes.insert_one(
                    {
                        "id": new_id(),
                        "chapter_id": ch["id"],
                        "title": f"{cname} - Practice Worksheet",
                        "description": "Practice problems with solutions.",
                        "url": "https://www.africau.edu/images/default/sample.pdf",
                        "created_at": now_iso(),
                    }
                )
                await db.tests.insert_one(
                    {
                        "id": new_id(),
                        "chapter_id": ch["id"],
                        "title": f"{cname} - Chapter Test",
                        "description": f"Test your understanding of {cname}.",
                        "duration_minutes": 10,
                        "questions": sample_questions_pool,
                        "created_at": now_iso(),
                    }
                )

        first_subject = await db.subjects.find_one({"batch_id": b["id"]}, {"_id": 0})
        await db.live_classes.insert_one(
            {
                "id": new_id(),
                "title": f"{b['name']} - Doubt Solving Session",
                "batch_id": b["id"],
                "subject_id": first_subject["id"] if first_subject else None,
                "youtube_url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
                "start_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
                "description": "Live doubt clearing session. Bring your questions!",
                "created_at": now_iso(),
            }
        )
        if student:
            await db.enrollments.insert_one(
                {"id": new_id(), "student_id": student["id"], "batch_id": b["id"], "enrolled_at": now_iso()}
            )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.batches.create_index("id", unique=True)
    await db.subjects.create_index("id", unique=True)
    await db.chapters.create_index("id", unique=True)
    await db.videos.create_index("id", unique=True)
    await db.notes.create_index("id", unique=True)
    await db.tests.create_index("id", unique=True)
    await db.live_classes.create_index("id", unique=True)
    await db.enrollments.create_index([("student_id", 1), ("batch_id", 1)])
    await seed_users()
    await seed_content()
    logger.info("LMS startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
