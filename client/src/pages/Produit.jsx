import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCharger } from '../useCharger.js';
import { lignes } from '../api.js';
import { Revele } from '../components/Decor.jsx';
import { Banniere, Coche, Traits, VisuelProduit, RecetteCarte, EnteteSection, Emballage, Quantites } from '../components/Elements.jsx';
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

  const nutrition = lignes(p.nutrition).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''];
  });

  return (
    <>
      <Banniere titre={p.nom} ariane={[{ label: 'Produits', to: '/produits' }, { label: p.nom }]} />

      <section className="section">
        <div className="conteneur deux-colonnes" style={{ gap: 64 }}>
          <Revele sens="gauche" className="visuel-produit">
            <Traits couleur="#C8221A" style={{ position: 'absolute', left: -10, bottom: 30 }} />
            <div className="principal"><VisuelProduit produit={p} taille={150} /></div>
          </Revele>
          <Revele sens="droite" className="texte-bloc">
            <span className="script">Œufs emballés</span>
            <h2>{p.nom}</h2>
            <p>{p.description || p.resume}</p>
            {lignes(p.points_forts).map((pt) => <Coche key={pt}>{pt}</Coche>)}
            {p.variantes?.length > 0 && (
              <div className="formats">
                <strong style={{ color: 'var(--vert)', marginRight: 6 }}>Disponible par :</strong>
                <Quantites variantes={p.variantes} />
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
              {p.variantes?.length > 0 && <a href="#conditionnements" className="btn btn-contour">Voir les conditionnements</a>}
              <Link to="/contact" className="btn btn-jaune">Où trouver ce produit</Link>
            </div>
          </Revele>
        </div>
      </section>

      {p.variantes?.length > 0 && (
        <section className="section section-grise" id="conditionnements">
          <div className="conteneur">
            <Revele><EnteteSection script="Choisissez votre format" titre="Nos conditionnements" /></Revele>
            <div className="grille-variantes">
              {p.variantes.map((v, i) => (
                <Revele key={v.id} sens="zoom" delai={i * 110}>
                  <article className="variante">
                    <div className="variante-visuel">
                      {v.image ? <img src={v.image} alt={`${p.nom}, ${v.libelle.toLowerCase()} de ${v.quantite} œufs`} loading="lazy" /> : <Emballage quantite={v.quantite} libelle={v.libelle} />}
                      <span className="variante-pastille" aria-hidden="true">{v.quantite}</span>
                    </div>
                    <h3>{v.libelle} de {v.quantite}</h3>
                    <span className="variante-detail">{v.quantite} œufs {p.nom}</span>
                    {v.reference && <span className="variante-ref">Réf. {v.reference}</span>}
                  </article>
                </Revele>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bande-jaune">
        <div className="grille">
          <Revele>
            <h3>Comment commander</h3>
            <p>Particuliers : en grande surface. Professionnels : contactez-nous pour un devis adapté à vos volumes.</p>
          </Revele>
          <Revele delai={150}>
            <h3>Livraison</h3>
            <p>Un réseau logistique optimisé depuis nos sites de Sfax, Grombalia et Djerba.</p>
          </Revele>
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
              {p.recettes.map((r, i) => <Revele key={r.id} delai={i * 150}><RecetteCarte recette={r} /></Revele>)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
