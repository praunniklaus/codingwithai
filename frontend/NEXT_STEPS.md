# Next Steps: Connecting Frontend to Backend

## Step 1: Set Up Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cd frontend
touch .env
```

Add this to `.env`:
```
VITE_MCP_API_URL=http://localhost:8792
```

## Step 2: Install Toast Notification Library

We'll use `react-hot-toast` for error notifications:

```bash
npm install react-hot-toast
```

## Step 3: Update API Service

The API service needs to handle OAuth tokens. We'll update it to:
1. Store OAuth tokens
2. Handle authentication flow
3. Add proper error handling

## Step 4: Connect Onboarding to API

Update the onboarding flow to save user data to the database when complete.

## Step 5: Replace Mock Data

Replace all mock data in Dashboard and Applications pages with real API calls.

## Step 6: Add Error Handling

Add toast notifications for errors and loading states.

Let's start!

