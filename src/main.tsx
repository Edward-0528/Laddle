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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/variables.css';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 s — avoids refetch on every tab focus
      gcTime: 5 * 60_000,      // 5 min — keep data in cache after unmount
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
