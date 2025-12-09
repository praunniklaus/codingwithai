# Job Application Assistant Frontend

A beautiful, modern React frontend for the Job Application Assistant.

## Features

- ✨ Beautiful onboarding flow with 10 questions
- 🎯 Dashboard with job matches and recommendations
- 📊 Application tracking
- 💡 AI-generated insights
- 🎨 Smooth animations with Framer Motion
- 📱 Fully responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your MCP API URL
```

3. Start development server:
```bash
npm run dev
```

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **React Hook Form** + **Zod** for validation
- **React Router** for routing
- **Lucide React** for icons

## Project Structure

```
src/
├── components/
│   ├── onboarding/        # Onboarding flow components
│   ├── dashboard/         # Dashboard components
│   └── shared/           # Reusable components
├── pages/                # Page components
├── services/             # API service layer
├── store/               # Zustand state management
└── hooks/               # Custom React hooks
```

## Development

The app runs on `http://localhost:5173` by default.

### Key Routes

- `/` - Landing page
- `/onboarding` - Onboarding flow (10 questions)
- `/dashboard` - Main dashboard with job matches

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
