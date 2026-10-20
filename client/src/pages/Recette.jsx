import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCharger } from '../useCharger.js';
import { lignes } from '../api.js';
import { Banniere, Oeuf, Icone } from '../components/Elements.jsx';
import Introuvable from './Introuvable.jsx';

export default function Recette() {
  const { slug } = useParams();
  const { donnees: r, chargement, erreur } = useCharger(`/api/recettes/${encodeURIComponent(slug)}`);

  useEffect(() => {
    if (r) document.title = `${r.titre} – Recette Ovolina`;
    return () => { document.title = 'Ovolina – Bien Sûr Bnina'; };
  }, [r]);

  if (erreur?.status === 404) return <Introuvable />;
  if (chargement) return <p className="chargement">Chargement…</p>;
  if (!r) return <p className="vide">Impossible de charger cette recette.</p>;

  const ingredients = lignes(r.ingredients);
  const etapes = lignes(r.etapes);

  return (
    <>
      <Banniere titre={r.titre} ariane={[{ label: 'Recettes', to: '/recettes' }, { label: r.titre }]} />

      <section className="section" style={{ paddingBottom: 56 }}>
        <div className="conteneur deux-colonnes" style={{ gap: 64 }}>
          <div className="forme-organique">
            <div className="soleil" style={{ background: 'var(--vert-fonce)', width: 150, height: 150, borderRadius: '50% 50% 50% 0' }} />
            <div
              className="photo"
              style={{ width: 'min(420px, 100%)', aspectRatio: '21 / 20', backgroundImage: r.image ? `url(${r.image})` : undefined }}
              role="img"
              aria-label={r.titre}
            />
          </div>
          <div className="texte-bloc">
            <span className="script">{r.categorie}</span>
            <h2>{r.titre}</h2>
            {r.resume && <p>{r.resume}</p>}
            <div className="meta-pastilles">
              {r.temps_preparation ? <span>{Icone.horloge()}{r.temps_preparation} min</span> : null}
              {r.personnes ? <span>{Icone.personnes()}{r.personnes} personne{r.personnes > 1 ? 's' : ''}</span> : null}
              <span>{Icone.niveau()}{r.difficulte}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 88 }}>
        <div className="conteneur colonnes-recette">
          <aside>
            {ingredients.length > 0 && (
              <div className="ingredients">
                <h3>Ingrédients</h3>
                <ul>{ingredients.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            )}
            {r.produit && (
              <Link to={`/produits/${r.produit.slug}`} className="produit-utilise">
                <span className="vignette" style={{ width: 64, height: 64, borderRadius: '50%' }}>
                  {r.produit.image ? <img src={r.produit.image} alt="" /> : <Oeuf jaune={r.produit.couleur_jaune} taille={30} />}
                </span>
                <span><span className="script">Produit utilisé</span><strong>Œufs {r.produit.nom} →</strong></span>
              </Link>
            )}
          </aside>
          <div>
            <h3 style={{ fontSize: 28, fontWeight: 800 }}>Préparation</h3>
            {etapes.map((e, i) => (
              <div className="etape" key={i}>
                <span className="num">{i + 1}</span>
                <p>{e}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
