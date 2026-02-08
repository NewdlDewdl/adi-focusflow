# FocusFlow Analytics Dashboard

## 🎯 What's Built

A comprehensive analytics dashboard showcasing 5 key metrics + AI assistant:

### 1. **Focus Score Heatmap** (Top Center)
- 7x24 grid showing focus performance by hour/day
- Color scale: warmGreen (best) → warmCoral → warmCoralLight → warmSurface (no data)
- Hover to see detailed stats for each time slot

### 2. **Focus Zone Distribution** (Bottom Center)
- Donut chart showing time distribution:
  - Deep Focus (80-100): warmGreen
  - Moderate (50-79): warmCoralLight
  - Distracted (0-49): warmBrownMuted

### 3. **Productivity Score** (Top Right)
- Large composite score (0-100) with 4 components:
  - Average Focus (40% weight)
  - Completion Rate (30% weight)
  - Streak (20% weight)
  - Improvement Trend (10% weight)

### 4. **Distraction Patterns** (Bottom Right)
- Bar chart showing frequency of distraction types:
  - Head Left/Right
  - Look Up/Down
  - Face Lost
- Shows average recovery time for each type

### 5. **Streak Calendar** (Bottom Row - Full Width)
- GitHub-style contribution graph
- Shows last 90 days of focus activity
- Color intensity based on total focus time
- 🔥 Current streak badge

### 6. **AI Focus Coach** (Left Column - Full Height)
- Context-aware Gemini AI assistant
- Trained on productivity expertise + user's analytics
- Falls back to general focus coaching if no data
- Quick prompts for common questions

## 🚀 Features

### Live Updates
- Dashboard polls localStorage every 2 seconds
- Updates immediately when demo session ends
- No page refresh needed

### Demo Data
- Automatically seeds 45 minutes of realistic mock data
- Spread across multiple sessions over 7 days
- Realistic focus patterns with distraction events

### Warm Theme
- All colors match website theme:
  - Background: #FDFBF7 (warmBeige)
  - Text: #43302B (warmBrown)
  - Accents: #C06C4C (warmCoral)
  - Highlights: #E07856 (warmCoralLight)
  - Success: #6F7D65 (warmGreen)

## 🔑 Setup: Adding Gemini API Key

The AI assistant requires a Gemini API key. Here's how to add it:

### 1. Get API Key
Visit: https://aistudio.google.com/apikey

### 2. Add to Environment
Open `.env.local` in the project root:

```bash
# .env.local
GEMINI_API_KEY=your_key_here
```

### 3. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. Test AI Assistant
- Open http://localhost:3001/dashboard
- Click on the AI Focus Coach card (left column)
- Type a message and hit enter
- Should respond with focus coaching advice

## 📊 Data Flow

### Session Data Structure
```typescript
{
  id: string
  startTime: number
  endTime: number
  duration: number
  status: 'completed' | 'abandoned'
  focusSnapshots: { timestamp: number, score: number }[]
  distractionEvents: { timestamp, type, duration, recoveryTime }[]
  avgScore: number
  peakScore: number
  focusedTime: number
  distractionCount: number
}
```

### Demo Flow
1. Dashboard seeds 45min of mock data on first load
2. User runs 1.5min demo session in /session
3. Session ends → saves to localStorage
4. Dashboard auto-updates (polls every 2s)
5. All charts refresh with new data
6. AI assistant gets updated context

## 🎨 Customization

### Adjust Update Frequency
In `src/app/dashboard/page.tsx`:
```typescript
// Change from 2000ms to desired interval
const interval = setInterval(() => {
  loadSessions();
}, 2000); // ← change this
```

### Modify Analytics Calculations
Edit `src/lib/analytics-engine.ts`:
- `calculateHeatmap()` - heatmap logic
- `calculateZoneDistribution()` - zone thresholds
- `calculateProductivityScore()` - weights and formula
- `analyzeDistractionPatterns()` - pattern grouping
- `generateStreakCalendar()` - calendar levels

### Customize AI Personality
Edit `src/app/api/assistant/chat/route.ts`:
- Modify `systemPrompt` to change coaching style
- Adjust response length guidelines
- Add/remove expertise areas

## 📁 File Structure

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx              # Main dashboard page
│   └── api/
│       └── assistant/
│           └── chat/
│               └── route.ts       # Gemini AI endpoint
├── components/
│   ├── dashboard/
│   │   ├── FocusHeatmap.tsx     # Analytics #1
│   │   ├── ZoneDistribution.tsx # Analytics #4
│   │   ├── ProductivityScore.tsx # Analytics #6
│   │   ├── DistractionPatterns.tsx # Analytics #7
│   │   ├── StreakCalendar.tsx   # Analytics #10
│   │   └── AIAssistant.tsx      # Chat interface
│   └── ui/
│       └── bento-grid.tsx        # Grid layout
└── lib/
    ├── analytics-engine.ts       # Pure calculation functions
    └── demo-data.ts             # Mock data generator
```

## 🧪 Testing

### Test with Demo Data
```bash
# Clear localStorage
localStorage.clear()

# Reload dashboard
# Demo data auto-seeds
```

### Test with Real Session
1. Navigate to http://localhost:3001/session
2. Allow camera
3. Complete calibration
4. Run 1-2 minute session
5. End session
6. Navigate to /dashboard
7. See updated analytics

### Test AI Assistant
```bash
# Make sure API key is set
echo $GEMINI_API_KEY  # Should show your key

# In browser console:
console.log(process.env.NEXT_PUBLIC_GEMINI_API_KEY)  # Should NOT be undefined
```

## 🎥 Demo Script (1.5 min video)

1. **Open landing page** (0:00-0:10)
   - Show warm theme
   - Click "Start Focus Session"

2. **Session page** (0:10-0:30)
   - Allow camera
   - Show calibration (blue-purple mesh)
   - Look at screen → green mesh
   - Turn head → yellow → orange → red
   - Return focus → back to green

3. **End session** (0:30-0:40)
   - Click "End Session"
   - Show session summary overlay

4. **Navigate to dashboard** (0:40-1:30)
   - Open /dashboard in new tab
   - Show heatmap updating live
   - Highlight productivity score
   - Point to distraction patterns
   - Show streak calendar
   - Chat with AI assistant:
     - "What's my best time to work?"
     - "How can I reduce distractions?"

## 🚨 Troubleshooting

### Dashboard not loading
- Check if dev server is running
- Verify port (3001 if 3000 was taken)
- Check browser console for errors

### No demo data showing
- Open browser console
- Look for "✅ Seeded 45 minutes of demo session data"
- If missing, clear localStorage and reload

### AI assistant not responding
- Check `.env.local` has GEMINI_API_KEY
- Restart dev server
- Check `/api/assistant/chat` endpoint in Network tab
- Verify API key has quota (https://aistudio.google.com/apikey)

### Charts not rendering
- Verify recharts installed: `npm list recharts`
- Check browser console for errors
- Try clearing cache and hard reload

## 📝 Next Steps

To integrate into main app:
1. Add distraction tracking to `DetectionProvider.tsx`
2. Store distraction events in session data
3. Add "View Analytics" button to session summary
4. Link from main nav

## 🎉 Ready for Demo!

The dashboard is now live at **http://localhost:3001/dashboard** with:
- ✅ All 5 analytics implemented
- ✅ AI assistant ready (add API key)
- ✅ Live updates every 2s
- ✅ Warm theme colors
- ✅ 45min of realistic demo data
- ✅ Responsive BentoGrid layout

Just add your Gemini API key and you're ready to record! 🚀
