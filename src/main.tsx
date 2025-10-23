import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Create root with type assertion and error handling
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Render app without StrictMode to avoid double renders in development
// StrictMode is useful for finding bugs but causes unnecessary re-renders
createRoot(rootElement).render(<App />);
