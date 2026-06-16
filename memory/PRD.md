# Coaching LMS — PRD

## Problem
Build a complete modern Coaching LMS Web Application inspired by Physics Wallah, with Admin and Student roles, supporting batches, subjects, chapters, recorded videos, PDF notes, MCQ tests and YouTube live classes.

## Stack
- Backend: FastAPI + MongoDB (motor)
- Frontend: React 19 + Tailwind + Shadcn UI + React Router 7
- Auth: JWT (httpOnly cookie + Authorization header), bcrypt

## Personas
- **Admin**: manages batches, subjects, chapters, videos, notes, MCQ tests, live classes, students
- **Student**: enrolled in batches, watches videos, downloads notes, takes MCQ tests, joins live classes

## Implemented (2026-02)
- JWT auth (login/register/me/logout) + role-based RBAC
- Seeded demo users: `admin@lms.com` / `admin123`, `student@lms.com` / `student123`
- Seeded data: 3 batches (NEET, JEE, Class 10) × subjects × chapters × videos × notes × MCQ tests + live classes
- Course taxonomy: Batch → Subject → Chapter → Videos / Notes / MCQ Tests
- Student dashboard: welcome, upcoming live, continue-watching, my batches, latest notes/tests
- Student flows: batch list, batch detail, subject detail, chapter detail (tabs), video player with prev/next + playlist + progress tracking, live class viewer (YouTube embed), MCQ test taking (timer + palette), instant result with breakdown
- Admin flows: dashboard with counters, CRUD for batches/subjects/chapters/videos/notes, MCQ test editor, live class publish, students + enroll
- Cascading deletes
- Design: Cabinet Grotesk headings + IBM Plex Sans body, Crimson #C92A2A primary, Navy #1E3A8A accent

## Architecture-ready (not yet implemented)
- Razorpay payment integration (batch purchase)
- Android WebView app
- Dynamic watermark on video player
- Secure DRM video delivery

## Backlog
- **P1**: Student attempt history, batch search/filter, video real progress (HTML5 events instead of poll)
- **P2**: Bulk MCQ CSV import, certificate generation on test pass, leaderboards, parental login, push notifications
- **P2**: Razorpay paid enrollment, Android WebView wrapper, watermarked video delivery

## Test Credentials
See `/app/memory/test_credentials.md`.
