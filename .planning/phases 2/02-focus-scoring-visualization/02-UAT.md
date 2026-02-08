---
status: testing
phase: 02-focus-scoring-visualization
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-02-07T21:35:00Z
updated: 2026-02-07T21:40:00Z
---

## Current Test

number: 2
name: Navigation to Session Page
expected: |
  Click "Start Focus Session" button on landing page. Should navigate to /session route and load the detection pipeline with webcam permission screen.
awaiting: diagnosis of test 1 blocker

## Tests

### 1. Landing Page with Animated Hero
expected: Navigate to / (root URL). You should see an animated landing page with cycling words animation ("real-time" → "AI-powered" → "intelligent" → "webcam-based") changing every 2.5 seconds, hero heading, privacy messaging, and "Start Focus Session" button with smooth fade-in animation on page load.
result: issue
reported: "Internal Server Error"
severity: blocker

### 2. Navigation to Session Page
expected: Click "Start Focus Session" button on landing page. Should navigate to /session route and load the detection pipeline with webcam permission screen.
result: [pending]

### 3. Live Focus Score Ring Display
expected: At /session after granting webcam permission, you should see a large animated circular progress ring (200px) displaying a 0-100 focus score in the center. The ring color should be green when score is high (≥70), yellow for medium (≥40), and red for low (<40). The score number should update in real-time with spring animation.
result: [pending]

### 4. Brief Look-Away (No False Alarm)
expected: While focused on the screen for 10 seconds (establish baseline), look away for 1-2 seconds, then return to screen. The focus score should NOT drop significantly or change color due to hysteresis protection. Score may shift slightly but should remain stable.
result: [pending]

### 5. Sustained Distraction (Gradual Decline)
expected: Look away from the screen continuously for 8-10+ seconds. The focus score should gradually decline (not instant drop) due to EMA smoothing (~7s window). Ring color should transition from green → yellow → red as score drops below thresholds. Animation should be smooth with spring physics.
result: [pending]

### 6. Score Recovery After Distraction
expected: After looking away (score dropped), return focus to the screen. The score should gradually recover over several seconds with EMA smoothing. Ring color should transition back to green as score recovers. Recovery should be smoother than drop due to asymmetric hysteresis.
result: [pending]

### 7. Sparkline Chart Trending
expected: Watch the sparkline chart (below the score ring) for 30-60 seconds while varying your focus (look at screen, look away, return). The sparkline should show a continuous line chart trending your score over time, with new data points appearing on the right edge. The line should visually match the score changes you observe in the ring.
result: [pending]

### 8. Stat Cards - Current Score
expected: The "Current Score" stat card should display the same numerical value as shown in the center of the score ring, with color-coded text matching the ring color scheme (green/yellow/red).
result: [pending]

### 9. Stat Cards - Session Duration
expected: The "Session Duration" stat card should show elapsed time in mm:ss format (e.g., "02:45") and tick up every second while the detection session is running.
result: [pending]

### 10. Stat Cards - Average Score
expected: The "Average Score" stat card should display the mean of all score values from the session history. Early in the session it may show "--" if insufficient data, then update to a numerical average as history accumulates.
result: [pending]

### 11. Sensitivity Slider Control
expected: Locate the sensitivity slider control (may be in a collapsible "Scoring Settings" or "Sensitivity" panel). Open it if collapsed. The slider should have labels "Steady" (left, low alpha = more smoothing) and "Responsive" (right, high alpha = less smoothing) with a range from 0.05 to 0.4. Adjusting the slider should show the current alpha value and immediately change how the score responds to head movements (more responsive = faster score changes, steadier = slower/smoother changes).
result: [pending]

### 12. Two-Column Responsive Layout
expected: On a desktop/large screen at /session, the layout should show webcam feed on the left side and scoring dashboard (ring + sparkline + stat cards) on the right side in a two-column layout. On smaller screens or mobile, the layout should stack vertically. The webcam feed should be sized reasonably (not full-width) to make room for the scoring UI.
result: [pending]

### 13. No Build or SSR Errors
expected: Run `npm run build` in the project directory. The build should complete successfully with no TypeScript errors, no ESLint errors, and specifically no SSR-related errors from Recharts components. Build output should show successful page generation for / and /session routes.
result: [pending]

## Summary

total: 13
passed: 0
issues: 1
pending: 12
skipped: 0

## Gaps

- truth: "User sees animated landing page at / with cycling hero text and CTA to start a session"
  status: failed
  reason: "User reported: Internal Server Error"
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
