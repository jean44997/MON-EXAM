# Mon Exam — PRD

## Vision
Mobile-first PWA & Expo app for BAC exam corrections targeting students in Côte d'Ivoire (primary), Sénégal, Burkina Faso and Mali.

## Core Flows
1. **Country selection** — Generates a fresh anonymous user_id (`MEX-xxx`) each session for security.
2. **Services** — 4 services + custom: pre-exam corrections, real-time, school accomplice, grade modification.
3. **Catalog** — Pick series (Générale / Industrielle F / Tertiaire G), then sub-series (A1, A2, C, D, E / F1–F8 / G1–G3).
4. **Subjects** — Locked previews with blur+padlock; price tag in XOF.
5. **Cart** — Multi-subject, pick offer pack (single 8k, exam 13k, pack5 35k, pack6 50k XOF).
6. **Checkout** — Wave / Orange Money instructions; phone required.
7. **Payment** — 5-minute countdown, unique activation code, simulated payment validation.
8. **Purchases** — Track orders (pending → awaiting_validation → paid), WhatsApp contact.
9. **Admin** — Token-protected (`monexam-admin-2026`) for validating payments.

## Security
- Fresh anonymous ID per session (rotating).
- Activation code bound to user_id + phone, single-use, 5-min TTL.
- Backend cleanup task expires unpaid orders.
- Admin endpoints protected via `x-admin-token` header.

## Pricing (XOF)
- Corrigé seul: 8 000 / sujet
- Sujet + corrigé: 13 000 / sujet
- Pack 5 corrigés (temps réel): 35 000
- Pack 6 sujets + corrigés: 50 000

## Tech
- Backend: FastAPI + MongoDB (motor)
- Frontend: Expo Router (React Native), expo-blur, expo-linear-gradient
- Storage: AsyncStorage via `@/src/utils/storage`
