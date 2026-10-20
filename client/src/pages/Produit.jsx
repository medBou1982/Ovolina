import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCharger } from '../useCharger.js';
import { lignes } from '../api.js';
import { Banniere, Coche, Traits, VisuelProduit, RecetteCarte, EnteteSection } from '../components/Elements.jsx';
import Introuvable from './Introuvable.jsx';

export default function Produit() {
  const { slug } = useParams();
  const { donnees: p, chargement, erreur } = useCharger(`/api/produits/${encodeURIComponent(slug)}`);

  useEffect(() => {
    if (p) document.title = `${p.nom} – Ovolina`;
    return () => { document.title = 'Ovolina – Bien Sûr Bnina'; };
  }, [p]);

  if (erreur?.status === 404) return <Introuvable />;
  if (chargement) return <p className="chargement">Chargement…</p>;
  if (!p) return <p className="vide">Impossible de charger ce produit.</p>;

  const formats = String(p.formats || '').split(',').map((f) => f.trim()).filter(Boolean);
  const nutrition = lignes(p.nutrition).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''];
  });

  return (
    <>
      <Banniere titre={p.nom} ariane={[{ label: 'Produits', to: '/produits' }, { label: p.nom }]} />

      <section className="section">
        <div className="conteneur deux-colonnes" style={{ gap: 64 }}>
          <div className="visuel-produit">
            <Traits couleur="#C8221A" style={{ position: 'absolute', left: -10, bottom: 30 }} />
            <div className="principal"><VisuelProduit produit={p} taille={150} /></div>
          </div>
          <div className="texte-bloc">
            <span className="script">Œufs emballés</span>
            <h2>{p.nom}</h2>
            <p>{p.description || p.resume}</p>
            {lignes(p.points_forts).map((pt) => <Coche key={pt}>{pt}</Coche>)}
            {formats.length > 0 && (
              <div className="formats">
                <strong style={{ color: 'var(--vert)', marginRight: 6 }}>Formats :</strong>
                {formats.map((f) => <span key={f}>{f}</span>)}
              </div>
            )}
            <Link to="/contact" className="btn btn-jaune" style={{ marginTop: 6 }}>Où trouver ce produit</Link>
          </div>
        </div>
      </section>

      <section className="bande-jaune">
        <div className="grille">
          <div>
            <h3>Comment commander</h3>
            <p>Particuliers : en grande surface. Professionnels : contactez-nous pour un devis adapté à vos volumes.</p>
          </div>
          <div>
            <h3>Livraison</h3>
            <p>Un réseau logistique optimisé depuis nos sites de Sfax, Grombalia et Djerba.</p>
          </div>
        </div>
      </section>

      {nutrition.length > 0 && (
        <section className="section">
          <div className="conteneur deux-colonnes">
            <div className="texte-bloc" style={{ gap: 10 }}>
              <span className="script">Pour 100 g</span>
              <h2>Valeurs nutritionnelles</h2>
            </div>
            <table className="tableau-nutrition">
              <tbody>
                {nutrition.map(([label, valeur]) => (
                  <tr key={label}><th scope="row">{label}</th><td>{valeur}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {p.recettes?.length > 0 && (
        <section className="section section-grise">
          <div className="conteneur">
            <EnteteSection script="À vos fourneaux" titre="Recettes avec ce produit" />
            <div className="grille-recettes">
              {p.recettes.map((r) => <RecetteCarte key={r.id} recette={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
