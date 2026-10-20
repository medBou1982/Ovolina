import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, jeton } from '../api.js';

export default function AdminLayout() {
  const [admin, setAdmin] = useState(undefined); // undefined = vérification en cours
  const [nouveaux, setNouveaux] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!jeton.lire()) { setAdmin(null); return; }
    api.get('/api/auth/me').then((r) => setAdmin(r.admin)).catch(() => { jeton.ecrire(null); setAdmin(null); });
  }, []);

  useEffect(() => {
    const surDeconnexion = () => setAdmin(null);
    window.addEventListener('ovolina:deconnexion', surDeconnexion);
    return () => window.removeEventListener('ovolina:deconnexion', surDeconnexion);
  }, []);

  const rafraichirCompteur = useCallback(() => {
    api.get('/api/admin/messages/nouveaux').then((r) => setNouveaux(r.total)).catch(() => {});
  }, []);

  useEffect(() => { if (admin) rafraichirCompteur(); }, [admin, pathname, rafraichirCompteur]);

  useEffect(() => { document.title = 'Administration – Ovolina'; }, []);

  if (admin === undefined) return <p className="chargement">Chargement…</p>;
  if (admin === null) return <Navigate to="/admin/connexion" replace state={{ depuis: pathname }} />;

  function deconnexion() {
    jeton.ecrire(null);
    navigate('/admin/connexion');
  }

  const actif = (prefixe) => ({ isActive }) => (isActive || pathname.startsWith(prefixe) ? 'active' : undefined);

  return (
    <div className="admin">
      <aside className="admin-menu">
        <Link to="/admin" className="logo-admin"><img src="/logo.png" alt="Ovolina, administration" /></Link>
        <nav aria-label="Administration">
          <NavLink to="/admin/produits" className={({ isActive }) => (isActive || pathname === '/admin' || pathname.startsWith('/admin/produits') ? 'active' : undefined)}>
            <svg width="20" height="20" viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true"><path d="M20 2C10 2 3 18 3 30a17 17 0 0 0 34 0C37 18 30 2 20 2z" /></svg>
            Produits
          </NavLink>
          <NavLink to="/admin/recettes" className={actif('/admin/recettes')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z" /><path d="M8 9h6M8 13h6" /></svg>
            Recettes
          </NavLink>
          <NavLink to="/admin/messages" className={actif('/admin/messages')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            Messages
            {nouveaux > 0 && <span className="compteur" aria-label={`${nouveaux} nouveaux`}>{nouveaux}</span>}
          </NavLink>
        </nav>
        <div className="bas-menu">
          <span className="qui">{admin.email}</span>
          <NavLink to="/admin/compte">Mot de passe</NavLink>
          <a href="/" target="_blank" rel="noreferrer">Voir le site ↗</a>
          <button type="button" onClick={deconnexion}>Déconnexion</button>
        </div>
      </aside>
      <main className="admin-contenu">
        <Outlet context={{ rafraichirCompteur }} />
      </main>
    </div>
  );
}
