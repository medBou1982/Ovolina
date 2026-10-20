import { useSearchParams } from 'react-router-dom';
import { useCharger } from '../useCharger.js';
import { Banniere, EnteteSection, RecetteCarte } from '../components/Elements.jsx';

const CATEGORIES = ['Toutes', 'Entrées', 'Plats', 'Desserts'];

export default function Recettes() {
  const [params, setParams] = useSearchParams();
  const categorie = CATEGORIES.includes(params.get('categorie')) ? params.get('categorie') : 'Toutes';
  const url = categorie === 'Toutes' ? '/api/recettes' : `/api/recettes?categorie=${encodeURIComponent(categorie)}`;
  const { donnees, chargement, erreur } = useCharger(url);

  return (
    <>
      <Banniere titre="Nos recettes" ariane={[{ label: 'Recettes' }]} />
      <section className="section">
        <div className="conteneur">
          <EnteteSection script="Inspirations culinaires" titre="Des recettes simples et gourmandes pour toutes les occasions" />
          <div className="filtres" role="group" aria-label="Filtrer par catégorie">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className="filtre"
                aria-pressed={c === categorie}
                onClick={() => setParams(c === 'Toutes' ? {} : { categorie: c })}
              >{c}</button>
            ))}
          </div>
          {chargement && <p className="chargement">Chargement…</p>}
          {erreur && <p className="vide">Impossible de charger les recettes pour le moment.</p>}
          {donnees && donnees.length === 0 && <p className="vide">Aucune recette dans cette catégorie pour l’instant.</p>}
          {donnees && donnees.length > 0 && (
            <div className="grille-recettes">
              {donnees.map((r) => <RecetteCarte key={r.id} recette={r} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
