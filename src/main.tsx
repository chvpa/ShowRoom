import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Create root with type assertion and error handling
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Create and render root in strict mode for better error detection
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
