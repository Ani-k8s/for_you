import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { GymBrandingProvider } from './branding/GymBrandingContext'
import { ToastProvider } from './components/ui/ToastProvider'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <GymBrandingProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </GymBrandingProvider>
    </StrictMode>,
  );
} catch (error) {
  console.error('[Fatal Error] Application failed to initialize:', error);
}
