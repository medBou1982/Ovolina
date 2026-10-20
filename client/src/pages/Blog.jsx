import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCharger } from '../useCharger.js';
import { Banniere, EnteteSection } from '../components/Elements.jsx';
import { Revele } from '../components/Decor.jsx';
import { ArticleCarte, Meta, VisuelArticle } from '../components/Blog.jsx';

const CATEGORIES = ['Tous', 'Actualités', 'Conseils', 'Nutrition', 'Recettes', 'Coulisses'];

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const categorie = CATEGORIES.includes(params.get('categorie')) ? params.get('categorie') : 'Tous';
  const url = categorie === 'Tous' ? '/api/articles' : `/api/articles?categorie=${encodeURIComponent(categorie)}`;
  const { donnees, chargement, erreur } = useCharger(url);

  useEffect(() => {
    document.title = 'Le blog – Ovolina';
    return () => { document.title = 'Ovolina – Bien Sûr Bnina'; };
  }, []);

  // En vue « Tous », le dernier article est mis en avant en grand
  const [une, ...reste] = categorie === 'Tous' && donnees?.length ? donnees : [null, ...(donnees || [])];

  return (
    <>
      <Banniere titre="Le blog" ariane={[{ label: 'Blog' }]} />
      <section className="section">
        <div className="conteneur">
          <Revele><EnteteSection script="Actualités & conseils" titre="Tout savoir sur l’œuf, de la ferme à l’assiette" /></Revele>

          <div className="filtres" role="group" aria-label="Filtrer par catégorie">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className="filtre" aria-pressed={c === categorie}
                onClick={() => setParams(c === 'Tous' ? {} : { categorie: c })}>{c}</button>
            ))}
          </div>

          {chargement && <p className="chargement">Chargement…</p>}
          {erreur && <p className="vide">Impossible de charger les articles pour le moment.</p>}
          {donnees && donnees.length === 0 && <p className="vide">Aucun article dans cette catégorie pour l’instant.</p>}

          {une && (
            <Revele>
              <Link to={`/blog/${une.slug}`} className="article-une">
                <VisuelArticle article={une} className="grand" />
                <div className="article-une-texte">
                  <span className="script">À la une</span>
                  <h2>{une.titre}</h2>
                  <Meta article={une} />
                  <p>{une.extrait}</p>
                  <span className="btn btn-jaune">Lire l’article</span>
                </div>
              </Link>
            </Revele>
          )}

          {reste.length > 0 && (
            <div className="grille-articles">
              {reste.map((a, i) => (
                <Revele key={`${categorie}-${a.id}`} delai={(i % 3) * 120}><ArticleCarte article={a} /></Revele>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
