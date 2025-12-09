# Reset Onboarding Flow

If the onboarding questions aren't appearing, it's likely because onboarding was marked as complete in localStorage.

## Quick Fix

### Option 1: Reset via URL (Easiest)

Add `?reset=true` to the onboarding URL:

```
http://localhost:5173/onboarding?reset=true
```

This will clear all saved progress and restart onboarding.

### Option 2: Clear Browser Storage

Open browser console (F12) and run:

```javascript
localStorage.removeItem('onboarding-answers');
localStorage.removeItem('job-assistant-storage');
location.reload();
```

### Option 3: Clear All Site Data

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear site data** or **Clear storage**
4. Refresh the page

## Why This Happens

The app saves your onboarding progress to localStorage. If you completed onboarding before, it remembers and redirects you to the dashboard.

## After Resetting

1. Go to: http://localhost:5173/onboarding?reset=true
2. You'll see the questions again
3. Complete onboarding fresh

---

**Note**: Resetting will clear your saved profile data. You'll need to complete onboarding again.

