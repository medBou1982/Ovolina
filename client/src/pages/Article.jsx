import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCharger } from '../useCharger.js';
import { Banniere, EnteteSection } from '../components/Elements.jsx';
import { Revele, Oiseau } from '../components/Decor.jsx';
import { ArticleCarte, Meta } from '../components/Blog.jsx';
import Contenu from '../components/Contenu.jsx';
import Introuvable from './Introuvable.jsx';

function Partager({ titre }) {
  const [copie, setCopie] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const e = encodeURIComponent;
  const liens = [
    { nom: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, d: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z' },
    { nom: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`, d: 'M5 9h3.5v11H5zM6.7 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10.5 9H14v1.6c.5-.9 1.7-1.9 3.6-1.9 3.6 0 4.4 2.3 4.4 5.4V20h-3.5v-5.1c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20h-3.5z' },
    { nom: 'WhatsApp', href: `https://wa.me/?text=${e(`${titre} ${url}`)}`, d: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z' }
  ];
  async function copier() {
    try { await navigator.clipboard.writeText(url); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ }
  }
  return (
    <div className="partager">
      <span>Partager</span>
      {liens.map((l) => (
        <a key={l.nom} href={l.href} target="_blank" rel="noreferrer" aria-label={`Partager sur ${l.nom}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={l.d} /></svg>
        </a>
      ))}
      <button type="button" onClick={copier} aria-label="Copier le lien">
        {copie
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>}
      </button>
      {copie && <span className="copie" role="status">Lien copié !</span>}
    </div>
  );
}

export default function Article() {
  const { slug } = useParams();
  const { donnees: a, chargement, erreur } = useCharger(`/api/articles/${encodeURIComponent(slug)}`);

  useEffect(() => {
    if (a) document.title = `${a.titre} – Blog Ovolina`;
    return () => { document.title = 'Ovolina – Bien Sûr Bnina'; };
  }, [a]);

  if (erreur?.status === 404) return <Introuvable />;
  if (chargement) return <p className="chargement">Chargement…</p>;
  if (!a) return <p className="vide">Impossible de charger cet article.</p>;

  return (
    <>
      <Banniere titre="Le blog" ariane={[{ label: 'Blog', to: '/blog' }, { label: a.categorie, to: `/blog?categorie=${encodeURIComponent(a.categorie)}` }]} />

      <article className="article-page">
        <header className="conteneur article-entete">
          <Revele>
            <Link to={`/blog?categorie=${encodeURIComponent(a.categorie)}`} className="badge-categorie statique">{a.categorie}</Link>
            <h1>{a.titre}</h1>
            <div className="article-infos">
              <span className="auteur"><span className="avatar" aria-hidden="true"><Oiseau /></span>{a.auteur}</span>
              <Meta article={a} />
            </div>
            {a.extrait && <p className="chapo">{a.extrait}</p>}
          </Revele>
        </header>

        {a.image && (
          <Revele className="conteneur" sens="zoom">
            <img className="article-image" src={a.image} alt="" />
          </Revele>
        )}

        <div className="conteneur">
          <div className="article-corps">
            <Contenu texte={a.contenu} />
            <Partager titre={a.titre} />
          </div>
        </div>
      </article>

      {a.suggestions?.length > 0 && (
        <section className="section section-grise">
          <div className="conteneur">
            <Revele><EnteteSection script="Continuez la lecture" titre="Ces articles peuvent vous intéresser" /></Revele>
            <div className="grille-articles">
              {a.suggestions.map((s, i) => <Revele key={s.id} delai={i * 120}><ArticleCarte article={s} /></Revele>)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
