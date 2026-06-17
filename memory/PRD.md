# GYAN RISE RANA E-LEARNING — PRD

## Problem
Production-ready Coaching LMS inspired by Physics Wallah for institutes managing batches, subjects, chapters, recorded videos, PDF notes, MCQ tests, YouTube live classes with real-time chat, and student progress.

## Stack
- Backend: FastAPI + MongoDB (motor) + WebSocket chat
- Frontend: React 19 + Tailwind + Shadcn UI + React Router 7
- Auth: JWT in cookie + Bearer header, bcrypt
- Branding: Blue (#1D4ED8) + Orange (#F97316) + White

## Personas
- **Admin** (manually provisioned, NOT publicly registerable): full CRUD on batches/subjects/chapters/videos/notes/tests/live classes/students; can pin & delete chat messages
- **Student** (self-registers): enrolled in batches, watches videos with watermark, downloads notes, takes MCQ tests, joins live classes with real-time chat

## Iteration 1 (2026-02) — initial build
- JWT auth, role-based RBAC, seeded demo accounts
- Batch → Subject → Chapter → Videos / Notes / MCQ Tests taxonomy
- Student dashboard, video player with prev/next, MCQ test taker with timer, live class viewer
- Admin CRUD across all entities

## Iteration 2 (2026-02) — GYAN RISE RANA upgrade
- **Branding**: full rename to GYAN RISE RANA E-LEARNING, browser title, Blue+Orange palette
- **Auth fix**: register endpoint hard-coded to role=student; admin accounts only manually
- **Live Chat**: WebSocket `/api/ws/chat/{lc}` — broadcast messages, presence, admin pin/delete; chat history persisted in `chat_messages` collection
- **Video Watermark**: floating overlay with student name/email/date/time, animated drift
- **Image Upload**: `/api/uploads/image` (admin, multipart, 4 MB cap) + `/api/images/{id}` serve, used for batch & subject covers; existing URL field still supported
- **Recently Viewed** (`/recent`) + **Continue Watching** (already on dashboard)
- **Course Completion**: `/api/progress/completion/{batch_id}` returns overall + per-subject %
- **Role Guard**: students redirected away from `/admin/*` automatically
- **Android prep**: documented FLAG_SECURE setup in `ANDROID_WEBVIEW.md`, mobile meta tags, no-context CSS, user-select disabled
- **Seed idempotent**: canonical batches restored on each startup if missing

## Test results
- Iteration 1: 17/17 backend, all frontend flows
- Iteration 2: 8/8 backend, all frontend flows (chat, watermark, image upload, completion, role guard)

## Architecture-ready (not implemented)
- Razorpay paid enrollment
- Native Android WebView wrapper (guide ready in `/app/memory/ANDROID_WEBVIEW.md`)
- Object-storage backed image hosting (currently base64 in DB — fine for cover images)

## Backlog
- **P1**: chat message editing, batch search/filter, real HTML5 video progress events
- **P2**: Razorpay paid enrollment, Android wrapper, bulk MCQ CSV import, certificates, leaderboards, push notifications

## Test Credentials
See `/app/memory/test_credentials.md`.
