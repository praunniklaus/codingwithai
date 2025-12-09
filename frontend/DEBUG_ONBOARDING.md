# Debug: Questions Not Appearing

## Quick Fix - Clear Everything

Open your browser console (F12) and run:

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Force reset onboarding
window.location.href = '/onboarding?reset=true';
```

## Or Use This URL

Just go to:
```
http://localhost:5173/onboarding?reset=true
```

## Check What's Happening

Open browser console (F12) and check:

1. **Check localStorage**:
```javascript
console.log('Onboarding complete:', localStorage.getItem('job-assistant-storage'));
console.log('Answers:', localStorage.getItem('onboarding-answers'));
```

2. **Check if component is rendering**:
Look for any errors in the console

3. **Force reset**:
```javascript
localStorage.removeItem('job-assistant-storage');
localStorage.removeItem('onboarding-answers');
location.reload();
```

## If Still Not Working

1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: Settings → Clear browsing data
3. **Try incognito mode**: Open in private/incognito window

---

**The questions SHOULD appear at: http://localhost:5173/onboarding?reset=true**

