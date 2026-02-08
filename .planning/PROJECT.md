# FocusFlow

## What This Is

FocusFlow is an AI-powered focus coaching tool for Hacklahoma 2026 that uses webcam-based tracking to detect when users are distracted and provides real-time voice nudges to help them refocus. It works in solo mode for individual productivity sessions and multiplayer mode for group study sessions with competitive leaderboards and collaborative goals.

## Core Value

Users must receive accurate, real-time awareness of when they're losing focus through webcam-based detection. If the focus detection doesn't work reliably, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Webcam-based focus tracking detects when user is distracted in real-time
- [ ] AI generates contextual coaching nudges based on focus state and streak context
- [ ] Voice synthesis speaks coaching nudges with natural audio
- [ ] Solo mode provides live focus score (0-100) with visual feedback
- [ ] Solo mode tracks session metrics (time, distractions, focused time)
- [ ] Multiplayer mode supports creating and joining study rooms with codes
- [ ] Multiplayer mode broadcasts live focus scores to all participants
- [ ] Multiplayer mode displays competitive leaderboard with rankings
- [ ] Multiplayer mode supports collaborative group goals
- [ ] Focus score calculation uses face detection and pose tracking data
- [ ] Nudge cooldown prevents annoying rapid-fire notifications (30s minimum)
- [ ] Session data persists for user history and analytics

### Out of Scope

- Cloud deployment (DigitalOcean) — localhost demo is sufficient for hackathon
- Blockchain token rewards (Solana) — nice-to-have, can skip if time constrained
- Mobile app — web-first, desktop browser only
- User authentication system — can use simple session storage for hackathon
- Advanced analytics dashboard — basic metrics are enough
- Calendar integration — manual session start is fine
- Spotify integration — out of scope for v1

## Context

**Hackathon**: Hacklahoma 2026 - happening soon (days/weeks timeline)

**Sponsor tracks** (5 integrations):
- Human.js — webcam face/pose tracking for focus detection
- Gemini 2.5 Flash API — AI coaching nudge generation
- ElevenLabs (eleven_turbo_v2) — text-to-speech for voice nudges
- Solana devnet — blockchain rewards (optional/stretch)
- DigitalOcean — cloud deployment (optional/stretch)

**Demo strategy**: Solo live demo on localhost showing:
1. User sitting at webcam with FocusFlow running
2. Focus score updating in real-time
3. Getting distracted (looking away, picking up phone)
4. Receiving AI voice nudge to refocus
5. Focus score recovering

**Multiplayer vision**: Study sessions where 2-5 people join a room, see each other's focus scores on a leaderboard, compete for highest average score, and work toward shared goals (e.g., "everyone maintain 80+ for 25 minutes").

## Constraints

- **Timeline**: Days/weeks until hackathon — ruthless prioritization required
- **Tech stack**: Next.js 15 + React + Tailwind CSS (frontend), Node.js + Express + Socket.io (backend), MongoDB (optional, in-memory fallback), Human.js, Gemini API, ElevenLabs API
- **Demo format**: Localhost deployment, solo live demo (multiplayer as backup/stretch)
- **Browser compatibility**: Desktop Chrome/Edge only (webcam API support required)
- **API costs**: Free/trial tiers for Gemini and ElevenLabs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus detection is top priority | Core value - if this doesn't work, nothing else matters | — Pending |
| Voice nudges over text-only | ElevenLabs sponsor track + better user experience | — Pending |
| Solo demo over multiplayer | Solo mode must be rock-solid for live demo; multiplayer can be simpler | — Pending |
| Localhost over cloud deployment | Reduces complexity, no networking issues during demo | — Pending |
| Skip blockchain rewards if needed | Nice-to-have for sponsor points but not core to focus tracking | — Pending |
| MongoDB optional with in-memory fallback | Can work without database for instant demo | — Pending |

---
*Last updated: 2026-02-07 after initialization*
