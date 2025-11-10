# 🚨 MUST RESTART THE APP! 🚨

## The Problem

You made code changes to the **main process** (`src/main/ipc-handlers.ts`).

The Electron app has **two processes**:
1. **Main Process** (Node.js backend) - handles IPC, file system, etc.
2. **Renderer Process** (React frontend) - the UI you see

**Hot reload only works for the renderer process!**
**Main process changes require a FULL restart!**

## How to Restart (Simple Steps)

### 1. Stop the Running App

Find the terminal where you ran `npm start` and press:
```
Ctrl + C
```

Or run this command in a new terminal:
```bash
pkill -f electron
```

### 2. Start Fresh

```bash
cd /Users/jin/Desktop/report_parser/automotive-appraisal
npm start
```

## How You'll Know It Worked

### ✅ Before Adding a Comparable

Open DevTools (Cmd+Option+I), go to Console tab.

### ✅ After Adding a Comparable

You should see this in the console:

```
[save-comparable] Enriched comparable: {
  id: "comp_...",
  qualityScore: 115.5,  ← NOT ZERO!
  adjustedPrice: 17250,
  listPrice: 18000
}
```

**If `qualityScore: 0`** → App didn't restart with new code!

## What You Should See in the UI

After adding the first comparable:

1. ✅ **Success notification** pops up
2. ✅ **Market Value card** appears
3. ✅ Shows calculated value (e.g., **$17,250**)
4. ✅ Shows confidence percentage
5. ✅ Shows "1 comparable"

## Screenshot Reference

```
┌─────────────────────────────────────────┐
│  📊 Market Value Analysis    ✓ Calculated│
├─────────────────────────────────────────┤
│                                          │
│          Calculated Market Value         │
│                                          │
│              $17,250                     │  ← YOU SHOULD SEE THIS!
│                                          │
│  🚗 1 comparable • Quality-Weighted Avg  │
│                                          │
│  Confidence Level: 75% ████████████░░░░  │
│                                          │
│  [ View Details ]  [ Generate Report ]   │
│                                          │
└─────────────────────────────────────────┘
```

## If You Still See No Difference

1. **Quit the app completely** (Cmd+Q)
2. **Kill any zombie processes**: `pkill -f electron`
3. **Clear the build cache**:
   ```bash
   cd /Users/jin/Desktop/report_parser/automotive-appraisal
   rm -rf .vite
   ```
4. **Start fresh**: `npm start`
5. **Open DevTools BEFORE adding a comparable**
6. **Watch the console as you add a comparable**

## Need Help?

Check these files to confirm changes are present:

```bash
# Should return line numbers
grep -n "Enriched comparable" /Users/jin/Desktop/report_parser/automotive-appraisal/src/main/ipc-handlers.ts

# Should return a line number
grep -n "success: true, marketAnalysis" /Users/jin/Desktop/report_parser/automotive-appraisal/src/main/ipc-handlers.ts
```

Both commands should return results. If they do, the code is there - you just need to restart!
