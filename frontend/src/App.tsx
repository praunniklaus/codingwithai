import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { useStore } from './store/useStore';

function App() {
  const { onboardingComplete } = useStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route 
          path="/onboarding" 
          element={
            onboardingComplete ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <OnboardingFlow />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            onboardingComplete ? (
              <Dashboard />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          } 
        />
        <Route 
          path="/applications" 
          element={
            onboardingComplete ? (
              <Applications />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
