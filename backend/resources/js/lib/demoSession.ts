export const isDemoModeEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo_mode') === 'true' || 
         (window as any).DEMO_MODE === true ||
         import.meta.env.VITE_DEMO_MODE === 'true';
};

export const setDemoMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('demo_mode', enabled ? 'true' : 'false');
};
