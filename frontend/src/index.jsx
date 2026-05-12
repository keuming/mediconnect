import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import Google Fonts
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Global styles
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Sora', -apple-system, sans-serif; background: #060C12; color: #F0F4F8; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0E1620; }
  ::-webkit-scrollbar-thumb { background: #1E2F42; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #243549; }
  select, input, textarea, button { font-family: inherit; }
  a { color: inherit; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
