# Quick Start Guide - Testing the Fixes

## IMPORTANT: You Must Restart the App!

The changes I made were to the **main process** (IPC handlers in `src/main/ipc-handlers.ts`). 

**Main process changes require a FULL APP RESTART** - hot reload doesn't work for these files.

## How to Restart the App

### Option 1: Using the Terminal (Recommended)

1. **Stop the current app:**
   - Find the terminal window where `npm start` is running
   - Press `Ctrl+C` to stop it
   - OR run: `pkill -f electron`

2. **Start the app again:**
   ```bash
   cd /Users/jin/Desktop/report_parser/automotive-appraisal
   npm start
   ```

### Option 2: Using the restart script

```bash
/Users/jin/Desktop/report_parser/automotive-appraisal/restart-app.sh
```

## How to Verify the Fixes Work

### Step 1: Check the App Started with New Code

**Open DevTools** (View → Toggle Developer Tools, or Cmd+Option+I)

Look for this in the console when the app starts:
```
[IPC handlers registered successfully]
```

### Step 2: Upload a Report

1. Click "New Appraisal"
2. Upload a PDF report
3. Wait for extraction to complete
4. Verify vehicle data appears

### Step 3: Add a Comparable

1. Click "Add Comparable" button
2. Fill in the form:
   - Source: `AutoTrader`
   - Year: `2015`
   - Make: `Toyota`
   - Model: `Camry`
   - Mileage: `48000`
   - Location: `San Diego, CA`
   - Price: `18000`
   - Condition: `Good`
3. Click "Save Comparable"

### Step 4: Verify Quality Score is Calculated ✅

**In DevTools Console**, you should see:

```javascript
[save-comparable] Enriched comparable: {
  id: "comp_1730...",
  qualityScore: 123.0,     // ← This should NOT be 0!
  adjustedPrice: 17100,    // ← Should be different from listPrice
  listPrice: 18000
}
```

**If you see `qualityScore: 0`**, the app hasn't restarted with the new code!

### Step 5: Verify Market Value Displays ✅

After saving the comparable, **within 1-2 seconds** you should see:

**In Console:**
```javascript
[calculateMarketValue] Starting calculation { appraisalId: "appr_..." }
[calculateMarketValue] All validations passed, proceeding with calculation
[calculateMarketValue] Calling IPC handler
[calculateMarketValue] IPC result received: { success: true, hasMarketAnalysis: true }
[calculateMarketValue] Market analysis: {
  appraisalId: "...",
  calculatedMarketValue: 17100,  // ← Should be a valid number!
  comparablesCount: 1,
  hasBreakdown: true
}
[calculateMarketValue] Store updated successfully
Market analysis updated: {
  calculatedValue: 17100,
  comparablesCount: 1,
  hasBreakdown: true
}
```

**In UI:**
- ✅ **Success notification** appears: "Market Value Calculated - New market value: $17,100"
- ✅ **Market Value card** appears below the comparables list
- ✅ Shows large value: **$17,100**
- ✅ Shows confidence percentage
- ✅ Shows "1 comparable"
- ✅ Shows "Quality-Weighted Average"

## What If It Still Doesn't Work?

### Issue: Console shows `qualityScore: 0`

**Diagnosis:** The app didn't restart properly with the new IPC handler code.

**Solution:**
1. Completely quit the Electron app (Cmd+Q)
2. Kill any remaining processes: `pkill -f electron`
3. Clear any build cache:
   ```bash
   cd /Users/jin/Desktop/report_parser/automotive-appraisal
   rm -rf .vite
   npm start
   ```

### Issue: No console logs appear when saving comparable

**Diagnosis:** DevTools might not be showing main process logs.

**Solution:**
1. Open DevTools
2. Click the gear icon (⚙️) in DevTools
3. Under "Console", enable "Show verbose logs"
4. Try saving a comparable again

### Issue: Market value shows "No Market Value Calculated"

**Diagnosis:** Check the console for errors.

**Possible errors and solutions:**

```javascript
Error: Appraisal with ID ... not found
```
→ The appraisal wasn't saved properly. Try re-uploading the PDF.

```javascript
[calculateMarketValue] No comparables available for calculation
```
→ The comparable didn't save. Check for save errors in console.

```javascript
[calculateMarketValue] Missing required fields in appraisal
```
→ The loss vehicle is missing required data. Edit the appraisal and fill in:
   - Mileage
   - Condition
   - Location

### Issue: TypeScript errors in console

If you see errors like:
```
Type 'X' is not assignable to type 'Y'
```

This might be a caching issue. Try:
```bash
cd /Users/jin/Desktop/report_parser/automotive-appraisal
rm -rf node_modules/.vite
npm start
```

## Expected Console Output (Complete Flow)

When everything works correctly, you should see this sequence:

```javascript
// 1. When you click "Save Comparable"
[save-comparable] Enriched comparable: {
  id: "comp_1730...",
  qualityScore: 115.5,
  adjustedPrice: 17250,
  listPrice: 18000
}

// 2. Comparable is saved
[save-comparable-success] { appraisalId: "appr_...", id: "comp_...", qualityScore: 115.5 }

// 3. Store automatically triggers market value calculation
[calculateMarketValue] Starting calculation { appraisalId: "appr_..." }
[calculateMarketValue] All validations passed, proceeding with calculation
[calculateMarketValue] Calling IPC handler

// 4. IPC handler processes
=== MarketValueCalculator.calculateMarketValue START ===
Input - Loss Vehicle: { vin: "...", year: 2015, make: "Toyota", ... }
Input - Comparables Count: 1
Input - Comparables: [{ id: "comp_...", qualityScore: 115.5, ... }]
Input validation passed
Calculating weighted values for each comparable...
Comparable 1: {
  id: "comp_...",
  listPrice: 18000,
  adjustedPrice: 17250,
  qualityScore: 115.5,
  weightedValue: 1992375,
  calculation: "17250 × 115.5 = 1992375"
}

// 5. Result is returned
[calculateMarketValue] IPC result received: {
  success: true,
  hasMarketAnalysis: true,
  error: undefined
}

// 6. Store is updated
[calculateMarketValue] Market analysis: {
  appraisalId: "appr_...",
  calculatedMarketValue: 17250,
  comparablesCount: 1,
  hasBreakdown: true
}
[calculateMarketValue] Store updated successfully

// 7. UI updates
Market analysis updated: {
  calculatedValue: 17250,
  comparablesCount: 1,
  hasBreakdown: true
}
```

## Quick Verification Checklist

After restarting the app and adding a comparable:

- [ ] Console shows `[save-comparable] Enriched comparable`
- [ ] `qualityScore` is NOT 0 (e.g., 115.5, 123.0, etc.)
- [ ] `adjustedPrice` is different from `listPrice`
- [ ] Console shows `[calculateMarketValue] Starting calculation`
- [ ] Console shows `IPC result received: { success: true, ... }`
- [ ] Console shows `calculatedMarketValue: [a number]`
- [ ] UI shows success notification
- [ ] UI shows Market Value card with dollar amount
- [ ] No errors in console

## Still Having Issues?

If after following these steps you still don't see the changes:

1. **Share the console logs** - Copy everything from DevTools console after adding a comparable
2. **Share any error messages** - Red errors are especially important
3. **Check these files haven't been modified**:
   - `src/main/ipc-handlers.ts` - lines 1082-1160 (save-comparable)
   - `src/main/ipc-handlers.ts` - lines 1165-1255 (update-comparable)
   - `src/main/ipc-handlers.ts` - line ~1260 (calculate-market-value return)
   - `src/renderer/store.ts` - lines ~1140-1180 (calculateMarketValue)

4. **Verify the changes are in the files**:
   ```bash
   grep -n "Enriched comparable" /Users/jin/Desktop/report_parser/automotive-appraisal/src/main/ipc-handlers.ts
   ```
   Should return two line numbers (one in save, one in update handler)

## Next Steps After Verification

Once you confirm it's working:

1. **Add more comparables** (3-5 total) and watch market value recalculate
2. **Edit a comparable** and verify recalculation
3. **Delete a comparable** and verify recalculation  
4. **Click "View Details"** to see calculation breakdown
5. **Try "Generate Report"** to create a DOCX

Enjoy your working market value calculations! 🎉
