import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// PWA : cache les assets statiques hors ligne, jamais les appels API
// (recherche, prise de RDV) qui doivent toujours venir du serveur.
serviceWorkerRegistration.register();
