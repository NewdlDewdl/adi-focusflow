# Phase 2 Context: Focus Scoring & Visualization

**Created:** 2026-02-07
**Source:** User discussion before planning

## Decisions

### Landing Page with Animated Hero

**LOCKED REQUIREMENT:** Phase 2 must include a landing page with an animated hero section.

**Implementation details:**
- Use Framer Motion for text animations (cycling words effect)
- Base structure on the Hero component pattern provided by user
- Adapt all text/messaging to FocusFlow branding:
  - Focus on: webcam-based focus tracking, AI coaching, staying productive
  - Remove generic SMB trade messaging
  - Emphasize privacy ("video never leaves your device")
- Keep only essential CTAs:
  - Primary: "Start Focus Session" or "Try FocusFlow" → launches detection
  - Remove: "Jump on a call" button (not relevant for hackathon demo)
  - Remove or adapt: "Read our launch article" badge (could become "Built for [hackathon name]" if applicable)

**Component structure:**
- Install Framer Motion: `npm install framer-motion`
- Install required shadcn/ui components: Button (using the Button code provided)
- Install lucide-react for icons
- Create Hero component with animated text cycling through focus-related words
- Integrate into app routing (landing page separate from detection view, or same page with scroll/transition)

**Text adaptation examples:**
- Hero heading: "Stay focused with" + [cycling words: "real-time", "AI-powered", "intelligent", "webcam-based"] + "coaching"
- Subheading: Focus on productivity, eye tracking, distraction detection, privacy-first approach
- Emphasize: No recording, browser-based, instant feedback

**Routing decision needed:**
- Should landing page be a separate route (`/` = hero, `/session` = detection)?
- Or same page with scroll-to-start pattern?
- Or hero as overlay before permission gate?

Claude's discretion on routing approach — choose what makes most sense for demo flow.

## Claude's Discretion

**Visual design:**
- Color scheme, exact animation timing, layout refinements
- Whether to add additional visual elements (demo video, screenshots, feature cards)
- Exact wording for hero text (as long as it's FocusFlow-relevant and emphasizes key value props)
- Icon choices from lucide-react

**Component architecture:**
- Where to place Hero component in file structure
- Whether to create reusable animation variants
- CSS/Tailwind customization beyond the base provided

**Integration with detection flow:**
- How user transitions from landing hero to webcam detection
- Whether to show a preview/teaser of the detection on the landing page

## Deferred Ideas

**Not in scope for Phase 2:**
- Multiple landing page variants or A/B testing
- SEO optimization, meta tags, Open Graph (hackathon demo, not production)
- Testimonials, pricing, feature comparison sections
- Newsletter signup or email capture
- Multi-language support

---

**When planning Phase 2:** The planner MUST include tasks to:
1. Install Framer Motion and required dependencies
2. Create Button component (shadcn/ui style) if not already in Phase 1
3. Create Hero component with FocusFlow-adapted text and animations
4. Integrate Hero into the app (either as landing page or detection page header)
5. Ensure smooth transition from hero to webcam detection flow
