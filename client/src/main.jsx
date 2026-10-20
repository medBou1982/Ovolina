import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SiteProvider } from './SiteContext.jsx';
import './styles.css';
import './animations.css';
import './footer.css';
import './blog.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <App />
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Fin de l'écran de démarrage : on laisse l'animation se jouer (1,9 s minimum), puis il remonte et disparaît
(function cacherSplash() {
  const splash = document.getElementById('splash');
  if (!splash || !document.documentElement.classList.contains('avec-splash')) { splash?.remove(); return; }
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const attente = Math.max(0, (reduit ? 500 : 1900) - (Date.now() - (window.__debutSplash || 0)));
  setTimeout(() => {
    splash.classList.add('sortie');
    const fin = () => {
      splash.remove();
      document.documentElement.classList.remove('avec-splash');
    };
    splash.addEventListener('transitionend', fin, { once: true });
    setTimeout(fin, 1200); // sécurité si la transition ne se déclenche pas
  }, attente);
})();
