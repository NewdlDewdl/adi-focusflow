---
status: testing
phase: 03-ai-coaching-nudges
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-02-08T21:00:00Z
updated: 2026-02-08T21:00:00Z
---

## Current Test

number: 1
name: Grace Period (60 seconds)
expected: |
  Start session, immediately look away from screen. Score drops and chimes start. No voice nudge should play during first 60 seconds. After 60 seconds, nudge becomes eligible.
awaiting: user response

## Tests

### 1. Grace Period (60 seconds)
expected: Start session, immediately look away from screen. Score drops and chimes start. No voice nudge should play during first 60 seconds. After 60 seconds, nudge becomes eligible.
result: [pending]

### 2. Nudge Trigger Within 2 Seconds
expected: After 60s grace period, look away until ~5 chimes accumulate (7-10 seconds). Voice coaching plays through speakers within 2 seconds of 5th chime. Audio is clear and natural (ElevenLabs Flash v2.5).
result: [pending]

### 3. Visual Nudge Indicator
expected: When nudge plays, NudgeIndicator appears on screen with blue/cyan styling (gentle tier), shows coaching message text, pulse animation visible, disappears when speech completes.
result: [pending]

### 4. Cooldown Period (30 seconds)
expected: After nudge completes, immediately look away again and let chimes accumulate. No second nudge plays within 30 seconds of first. After 30+ seconds, second nudge becomes eligible.
result: [pending]

### 5. Recovery Suppression
expected: Start losing focus (look away), let score drop and chimes start. Before nudge triggers, look back at screen (score trends upward/recovering). Look away again while score still trending up. No nudge plays while score actively recovering.
result: [pending]

### 6. Escalation Tiers - First Nudge (Gentle)
expected: First nudge after grace period shows blue/cyan indicator, gentle message (e.g., "Stay focused", "You've got this").
result: [pending]

### 7. Escalation Tiers - Second Nudge (Medium)
expected: Second nudge (after 30s+ cooldown) shows amber/yellow indicator, firmer message (e.g., "Focus on your task").
result: [pending]

### 8. Escalation Tiers - Third Nudge (Direct)
expected: Third nudge (after another 30s+ cooldown) shows red indicator, direct message (e.g., "Look at your screen now"). Escalation persists across session.
result: [pending]

### 9. Pre-Cache Warm-Up
expected: Open browser console, refresh /session page, grant webcam. Console shows pre-cache or warm-up messages. Warm-up happens in background without blocking UI.
result: [pending]

### 10. SpeechSynthesis Fallback
expected: Stop dev server, remove ELEVENLABS_API_KEY from .env.local, restart server. Trigger nudge (look away after 60s). Browser speech synthesis plays message (may sound robotic), NudgeIndicator still appears, no errors in console.
result: [pending]

### 11. Contextual Coaching Text
expected: Across multiple nudges, messages vary and feel contextual (not always same phrase). Gemini generates different coaching text each time.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
