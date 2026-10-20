import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useCharger } from '../useCharger.js';
import { dateLongue } from '../components/Blog.jsx';

export function statutArticle(a) {
  if (!a.publie) return { texte: 'Brouillon', classe: 'pilule-off' };
  if (new Date(a.publie_le) > new Date()) return { texte: 'Programmé', classe: 'pilule-nouveau' };
  return { texte: 'Publié', classe: 'pilule-ok' };
}

export default function AdminArticles() {
  const { donnees, chargement, erreur, recharger } = useCharger('/api/admin/articles');
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState(null);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (donnees || []).filter((a) => !q || a.titre.toLowerCase().includes(q) || a.categorie.toLowerCase().includes(q));
  }, [donnees, recherche]);

  async function supprimer(a) {
    if (!window.confirm(`Supprimer définitivement l’article « ${a.titre} » ?`)) return;
    try {
      await api.del(`/api/admin/articles/${a.id}`);
      setMessage({ ok: true, texte: `« ${a.titre} » a été supprimé.` });
      recharger();
    } catch (err) { setMessage({ ok: false, texte: err.message }); }
  }

  const nbPublies = (donnees || []).filter((a) => statutArticle(a).texte === 'Publié').length;

  return (
    <>
      <div className="admin-titre">
        <div>
          <h1>Blog</h1>
          <span className="sous">{donnees ? `${donnees.length} article${donnees.length > 1 ? 's' : ''}, dont ${nbPublies} en ligne` : ' '}</span>
        </div>
        <Link to="/admin/blog/nouveau" className="btn btn-jaune">+ Écrire un article</Link>
      </div>

      {message && <p className={`alerte ${message.ok ? 'alerte-ok' : 'alerte-erreur'}`} role="status">{message.texte}</p>}

      <label className="recherche">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A665E" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <span className="sr-only">Rechercher</span>
        <input type="search" placeholder="Rechercher un article" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>

      {chargement && <p className="chargement">Chargement…</p>}
      {erreur && <p className="alerte alerte-erreur">{erreur.message}</p>}
      {donnees && (
        <div className="tableau-admin-boite">
          <table className="tableau-admin">
            <thead>
              <tr><th scope="col">Article</th><th scope="col">Catégorie</th><th scope="col">Date</th><th scope="col">Statut</th><th scope="col" style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {liste.map((a) => {
                const st = statutArticle(a);
                return (
                  <tr key={a.id}>
                    <td>
                      <span className="nom">
                        <span className="vignette" style={{ background: 'var(--vert-clair)' }}>{a.image && <img src={a.image} alt="" />}</span>
                        <span><strong>{a.titre}</strong><br /><span style={{ color: 'var(--gris)', fontSize: 13 }}>{a.minutes} min de lecture · {a.auteur}</span></span>
                      </span>
                    </td>
                    <td>{a.categorie}</td>
                    <td style={{ color: 'var(--gris)', whiteSpace: 'nowrap' }}>{dateLongue(a.publie_le)}</td>
                    <td><span className={`pilule ${st.classe}`}>{st.texte}</span></td>
                    <td>
                      <span className="actions">
                        {st.texte === 'Publié' && <a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer" className="btn-petit">Voir</a>}
                        <Link to={`/admin/blog/${a.id}`} className="btn-petit">Modifier</Link>
                        <button type="button" className="btn-petit btn-icone" aria-label={`Supprimer ${a.titre}`} onClick={() => supprimer(a)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {liste.length === 0 && <tr><td colSpan={5} className="vide">{recherche ? 'Aucun article ne correspond.' : 'Aucun article pour l’instant.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
