import { Link } from 'react-router-dom';
import { Oiseau } from './Decor.jsx';

export const dateLongue = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Visuel d'un article : sa photo, ou un motif aux couleurs Ovolina s'il n'en a pas
export function VisuelArticle({ article, className = '' }) {
  return (
    <div className={`visuel-article ${className}`} style={article.image ? { backgroundImage: `url(${article.image})` } : undefined}>
      {!article.image && <Oiseau className="motif-oiseau" />}
      <span className="badge-categorie">{article.categorie}</span>
    </div>
  );
}

export function Meta({ article }) {
  return (
    <span className="meta-article">
      <time dateTime={article.publie_le}>{dateLongue(article.publie_le)}</time>
      <span aria-hidden="true">·</span>
      <span>{article.minutes} min de lecture</span>
    </span>
  );
}

export function ArticleCarte({ article }) {
  return (
    <Link to={`/blog/${article.slug}`} className="article-carte">
      <VisuelArticle article={article} />
      <div className="article-texte">
        <Meta article={article} />
        <h3>{article.titre}</h3>
        <p>{article.extrait}</p>
        <span className="lire">Lire l’article <span aria-hidden="true">→</span></span>
      </div>
    </Link>
  );
}
