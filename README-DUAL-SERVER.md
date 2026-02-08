# Focus Flow - Dual Server Setup

This setup allows you to run both versions simultaneously for comparison:

## 🚀 Quick Start

### Option 1: Run Both Automatically
```bash
./run-both.sh
```

### Option 2: Run Manually

**Terminal 1 - Next.js + Face Detection (Port 3000):**
```bash
npm run dev
```
Then open: http://localhost:3000/session

**Terminal 2 - Standalone HTML Frontend (Port 3002):**
```bash
node server-3002.js
```
Then open: http://localhost:3002

---

## 📊 Comparison

### Port 3000 - Next.js App
- ✅ **Full face detection** with Human.js
- ✅ **Real-time scoring** and calibration
- ✅ **Face mesh overlay** with color feedback
- ✅ **Session tracking** with localStorage
- ✅ **Dark theme** (gray-950 background)
- ⚙️ **Aspect Ratio**: 4:3 (640px max width)
- 🎯 **Status**: Fully functional detection pipeline

### Port 3002 - Standalone HTML
- 🎨 **Beautiful warm design** (earth tones)
- 🎨 **Smooth animations** and transitions
- 🎨 **Glass morphism** effects
- 🎨 **Voice visualizer** (UI only)
- ⚙️ **Aspect Ratio**: 16:9 (1280px max width)
- ⚠️ **Status**: UI mockup only - NO face detection

---

## 🔧 Key Differences

| Feature | Port 3000 (Next.js) | Port 3002 (HTML) |
|---------|---------------------|------------------|
| **Face Detection** | ✅ Yes | ❌ No |
| **Webcam Access** | ✅ Yes | ❌ No |
| **Design Theme** | Dark | Light/Warm |
| **Aspect Ratio** | 4:3 | 16:9 |
| **Container Width** | 640px | 1280px |
| **Framework** | React/Next.js | Vanilla JS |
| **Animations** | Minimal | Extensive |
| **Focus Scoring** | ✅ Real-time | ❌ None |

---

## ⚠️ Important Notes

### Aspect Ratio Issue
The face detection on port 3000 is calibrated for **4:3 aspect ratio**. If you want to integrate the detection into the 16:9 container on port 3002, the following must be changed:

1. **Update WebcamView.tsx** (line 349):
   ```tsx
   // Change from:
   style={{ aspectRatio: '4/3', minHeight: '360px' }}

   // To:
   style={{ aspectRatio: '16/9', minHeight: '360px' }}
   ```

2. **Update container width** (line 346):
   ```tsx
   // Change from:
   className="block w-full max-w-[640px] -scale-x-100"

   // To:
   className="block w-full max-w-full -scale-x-100"
   ```

3. **Recalibrate detection thresholds** - The scoring algorithm expects certain head positions based on 4:3 framing

### Integration Path
To merge the best of both:
1. Convert the HTML design to React/TSX
2. Change aspect ratio to 16:9
3. Apply warm color theme to detection components
4. Test and recalibrate scoring thresholds

---

## 🎯 Next Steps

**Current State:**
- Two separate apps running on different ports
- Port 3000 has working detection but basic UI
- Port 3002 has beautiful UI but no detection

**To Integrate:**
1. Use the HTML on port 3002 as design reference
2. Create new React page with warm theme
3. Adjust aspect ratio to 16:9
4. Insert DetectionProvider component
5. Style to match warm aesthetic

---

## 📝 Files Created

- `public/focus-flow.html` - Standalone HTML frontend
- `server-3002.js` - Simple HTTP server for port 3002
- `run-both.sh` - Bash script to launch both servers
- `README-DUAL-SERVER.md` - This file

---

## 🛑 Stopping the Servers

If using `run-both.sh`:
- Press `Ctrl+C` in the terminal

If running manually:
- Press `Ctrl+C` in each terminal window

---

## 🐛 Troubleshooting

**Port 3000 already in use:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

**Port 3002 already in use:**
```bash
# Find and kill the process
lsof -ti:3002 | xargs kill -9
```

**Next.js build errors:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run dev
```

---

Made with ❤️ by Claude Code
