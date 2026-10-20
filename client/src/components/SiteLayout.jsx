import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Vague } from './Elements.jsx';
import { SITE } from '../site.js';

function Entete() {
  const [ouvert, setOuvert] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOuvert(false), [pathname]);

  const lien = (to, label, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'actif' : undefined)}>{label}</NavLink>
  );

  return (
    <header className="entete">
      <div className="conteneur">
        <Link to="/" className="logo" aria-label="Ovolina, accueil">
          <img src="/logo.png" alt="Ovolina – Bien sûr Bnina !" width="147" height="64" />
        </Link>
        <button
          type="button"
          className="burger"
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOuvert((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006838" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <nav id="menu-principal" className={`nav${ouvert ? ' ouvert' : ''}`} aria-label="Navigation principale">
          {lien('/', 'Accueil', true)}
          <Link to="/#apropos">À propos</Link>
          {lien('/produits', 'Produits')}
          {lien('/recettes', 'Recettes')}
          {lien('/contact', 'Contact')}
        </nav>
      </div>
    </header>
  );
}

function Pied() {
  return (
    <footer className="pied">
      <Vague couleur="#fff" position="haut" variante={1} />
      <div className="conteneur">
        <div className="grille">
          <div className="colonne">
            <Link to="/" className="logo"><img src="/logo.png" alt="Ovolina" width="165" height="72" /></Link>
            <span>Des œufs frais, sains et traçables, produits avec soin à Sfax, Grombalia et Djerba.</span>
          </div>
          <div className="colonne">
            <strong>Liens</strong>
            <Link to="/produits">› Nos produits</Link>
            <Link to="/recettes">› Nos recettes</Link>
            <Link to="/#apropos">› À propos</Link>
            <Link to="/contact">› Contact</Link>
          </div>
          <div className="colonne">
            <strong>Nous joindre</strong>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <a href={`tel:${SITE.telephoneLien}`}>{SITE.telephone}</a>
            <span>{SITE.sites.map((s) => s.ville).join(' · ')}</span>
          </div>
        </div>
        <div className="bas">
          <span>© {new Date().getFullYear()} Ovolina. Tous droits réservés.</span>
          <span>Bien sûr Bnina !</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  const { pathname, hash } = useLocation();

  // Remonte en haut à chaque page, ou descend jusqu'à l'ancre (#apropos)
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a href="#contenu" className="sr-only">Aller au contenu</a>
      <Entete />
      <main id="contenu"><Outlet /></main>
      <Pied />
    </>
  );
}
