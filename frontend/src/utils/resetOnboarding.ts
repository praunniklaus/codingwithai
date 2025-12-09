/**
 * Utility to reset onboarding progress
 * Call this if you want to restart the onboarding flow
 */

export const resetOnboarding = () => {
  // Clear localStorage
  localStorage.removeItem('onboarding-answers');
  localStorage.removeItem('job-assistant-storage');
  
  // Reload page to reset state
  window.location.href = '/onboarding';
};

