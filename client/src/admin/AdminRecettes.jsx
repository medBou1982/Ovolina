import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useCharger } from '../useCharger.js';

export default function AdminRecettes() {
  const { donnees, chargement, erreur, recharger } = useCharger('/api/admin/recettes');
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState(null);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (donnees || []).filter((r) => !q || r.titre.toLowerCase().includes(q));
  }, [donnees, recherche]);

  async function supprimer(r) {
    if (!window.confirm(`Supprimer définitivement la recette « ${r.titre} » ?`)) return;
    try {
      await api.del(`/api/admin/recettes/${r.id}`);
      setMessage({ ok: true, texte: `« ${r.titre} » a été supprimée.` });
      recharger();
    } catch (err) {
      setMessage({ ok: false, texte: err.message });
    }
  }

  return (
    <>
      <div className="admin-titre">
        <div>
          <h1>Recettes</h1>
          <span className="sous">{donnees ? `${donnees.length} recette${donnees.length > 1 ? 's' : ''}` : ' '}</span>
        </div>
        <Link to="/admin/recettes/nouvelle" className="btn btn-jaune">+ Ajouter une recette</Link>
      </div>

      {message && <p className={`alerte ${message.ok ? 'alerte-ok' : 'alerte-erreur'}`} role="status">{message.texte}</p>}

      <label className="recherche">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A665E" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <span className="sr-only">Rechercher</span>
        <input type="search" placeholder="Rechercher une recette" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>

      {chargement && <p className="chargement">Chargement…</p>}
      {erreur && <p className="alerte alerte-erreur">{erreur.message}</p>}
      {donnees && (
        <div className="tableau-admin-boite">
          <table className="tableau-admin">
            <thead>
              <tr><th scope="col">Recette</th><th scope="col">Catégorie</th><th scope="col">Produit lié</th><th scope="col">Statut</th><th scope="col" style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {liste.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="nom">
                      <span className="vignette" style={{ background: 'var(--vert-clair)' }}>{r.image && <img src={r.image} alt="" />}</span>
                      <strong>{r.titre}</strong>
                    </span>
                  </td>
                  <td>{r.categorie}</td>
                  <td style={{ color: 'var(--gris)' }}>{r.produit_nom || '—'}</td>
                  <td><span className={`pilule ${r.actif ? 'pilule-ok' : 'pilule-off'}`}>{r.actif ? 'Visible' : 'Masquée'}</span></td>
                  <td>
                    <span className="actions">
                      <Link to={`/admin/recettes/${r.id}`} className="btn-petit">Modifier</Link>
                      <button type="button" className="btn-petit btn-icone" aria-label={`Supprimer ${r.titre}`} onClick={() => supprimer(r)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {liste.length === 0 && (
                <tr><td colSpan={5} className="vide">{recherche ? 'Aucune recette ne correspond.' : 'Aucune recette pour l’instant.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
