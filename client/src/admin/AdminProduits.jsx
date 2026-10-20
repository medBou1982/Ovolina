import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useCharger } from '../useCharger.js';
import { Oeuf } from '../components/Elements.jsx';

export default function AdminProduits() {
  const { donnees, chargement, erreur, recharger } = useCharger('/api/admin/produits');
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState(null);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (donnees || []).filter((p) => !q || p.nom.toLowerCase().includes(q));
  }, [donnees, recherche]);

  async function supprimer(p) {
    const avert = p.nb_recettes ? `\n${p.nb_recettes} recette(s) liée(s) perdront leur lien vers ce produit.` : '';
    if (!window.confirm(`Supprimer définitivement « ${p.nom} » ?${avert}`)) return;
    try {
      await api.del(`/api/admin/produits/${p.id}`);
      setMessage({ ok: true, texte: `« ${p.nom} » a été supprimé.` });
      recharger();
    } catch (err) {
      setMessage({ ok: false, texte: err.message });
    }
  }

  return (
    <>
      <div className="admin-titre">
        <div>
          <h1>Produits</h1>
          <span className="sous">{donnees ? `${donnees.length} produit${donnees.length > 1 ? 's' : ''} · affichés dans l’ordre ci-dessous sur le site` : ' '}</span>
        </div>
        <Link to="/admin/produits/nouveau" className="btn btn-jaune">+ Ajouter un produit</Link>
      </div>

      {message && <p className={`alerte ${message.ok ? 'alerte-ok' : 'alerte-erreur'}`} role="status">{message.texte}</p>}

      <label className="recherche">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A665E" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <span className="sr-only">Rechercher</span>
        <input type="search" placeholder="Rechercher un produit" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>

      {chargement && <p className="chargement">Chargement…</p>}
      {erreur && <p className="alerte alerte-erreur">{erreur.message}</p>}
      {donnees && (
        <div className="tableau-admin-boite">
          <table className="tableau-admin">
            <thead>
              <tr><th scope="col">Produit</th><th scope="col">Lien</th><th scope="col">Ordre</th><th scope="col">Statut</th><th scope="col" style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="nom">
                      <span className="vignette">{p.image ? <img src={p.image} alt="" /> : <Oeuf jaune={p.couleur_jaune} taille={22} />}</span>
                      <strong>{p.nom}</strong>
                    </span>
                  </td>
                  <td style={{ color: 'var(--gris)' }}>/produits/{p.slug}</td>
                  <td>{p.ordre}</td>
                  <td><span className={`pilule ${p.actif ? 'pilule-ok' : 'pilule-off'}`}>{p.actif ? 'Visible' : 'Masqué'}</span></td>
                  <td>
                    <span className="actions">
                      <Link to={`/admin/produits/${p.id}`} className="btn-petit">Modifier</Link>
                      <button type="button" className="btn-petit btn-icone" aria-label={`Supprimer ${p.nom}`} onClick={() => supprimer(p)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {liste.length === 0 && (
                <tr><td colSpan={5} className="vide">{recherche ? 'Aucun produit ne correspond.' : 'Aucun produit pour l’instant.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
