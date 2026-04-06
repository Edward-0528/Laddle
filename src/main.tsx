// ---------------------------------------------------------------------------
// Application Entry Point
// Renders the React application into the DOM with all required providers:
//   - StrictMode   : Development-time checks
//   - BrowserRouter: Client-side routing
//   - AuthProvider : Firebase authentication context
// ---------------------------------------------------------------------------

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/variables.css';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
