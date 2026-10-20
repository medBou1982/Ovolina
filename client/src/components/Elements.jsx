import { Link } from 'react-router-dom';
import { OeufsFlottants } from './Decor.jsx';

// Bord ondulé entre deux sections. "haut" : la vague mord le haut de la section.
export function Vague({ couleur = '#fff', position = 'haut', variante = 0 }) {
  const chemins = position === 'haut'
    ? ['M0 0H1440V16C1180 30 980 6 720 18S240 30 0 12Z', 'M0 0H1440V14C1160 28 900 4 640 18S200 26 0 10Z']
    : ['M0 40H1440V20C1200 6 960 30 700 16S220 4 0 24Z', 'M0 40H1440V24C1180 8 940 30 700 18S220 6 0 26Z'];
  return (
    <svg className="vague" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path d={chemins[variante % 2]} fill={couleur} />
    </svg>
  );
}

// Œuf dessiné : sert d'illustration quand un produit n'a pas encore de photo
export function Oeuf({ jaune = '#F2A20C', taille = 96 }) {
  return (
    <svg width={taille} height={taille * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <path d="M20 2C10 2 3 18 3 30a17 17 0 0 0 34 0C37 18 30 2 20 2z" fill="#fff" stroke="#006838" strokeWidth="1.5" />
      <circle cx="20" cy="31" r="9" fill={jaune} />
    </svg>
  );
}

export function VisuelProduit({ produit, taille = 96 }) {
  return produit.image
    ? <img src={produit.image} alt="" loading="lazy" />
    : <Oeuf jaune={produit.couleur_jaune} taille={taille} />;
}

// Bannière verte des pages intérieures, avec fil d'Ariane
export function Banniere({ titre, ariane = [] }) {
  return (
    <section className="banniere" style={{ backgroundImage: 'url(/images/banniere.jpg)' }}>
      <OeufsFlottants />
      <Vague position="haut" />
      <div className="conteneur">
        <h1>{titre}</h1>
        <nav className="ariane" aria-label="Fil d’Ariane">
          <Link to="/">Accueil</Link>
          {ariane.map((el) => (
            <span key={el.label} style={{ display: 'contents' }}>
              <span className="sep" aria-hidden="true">•</span>
              {el.to ? <Link to={el.to}>{el.label}</Link> : <span>{el.label}</span>}
            </span>
          ))}
        </nav>
      </div>
      <Vague position="bas" />
    </section>
  );
}

export function EnteteSection({ script, titre }) {
  return (
    <div className="entete-section">
      {script && <span className="script">{script}</span>}
      <h2>{titre}</h2>
    </div>
  );
}

export function ProduitCarte({ produit }) {
  return (
    <Link to={`/produits/${produit.slug}`} className="produit-carte">
      <div className="produit-visuel"><VisuelProduit produit={produit} /></div>
      <strong>{produit.nom}</strong>
      <span>{produit.resume}</span>
      <Quantites variantes={produit.variantes} />
    </Link>
  );
}

export function RecetteCarte({ recette }) {
  return (
    <Link to={`/recettes/${recette.slug}`} className="recette-carte">
      <div
        className="visuel"
        style={recette.image ? { backgroundImage: `url(${recette.image})` } : undefined}
      >
        <span className="badge">{recette.categorie}</span>
        {recette.video_youtube && (
          <span className="badge-video" aria-label="Recette en story vidéo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
            Story
          </span>
        )}
      </div>
      <strong>{recette.titre}</strong>
      <span className="meta">
        {recette.temps_preparation ? <span>{recette.temps_preparation} min</span> : null}
        <span>{recette.difficulte}</span>
      </span>
    </Link>
  );
}

export function Coche({ children }) {
  return (
    <div className="coche">
      <span className="rond">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004A27" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Traits({ couleur = '#004A27', style }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true" style={style}>
      <g stroke={couleur} strokeWidth="7" strokeLinecap="round">
        <path d="M44 10 L48 30" /><path d="M14 30 L32 42" /><path d="M6 64 L28 64" />
      </g>
    </svg>
  );
}

export const Icone = {
  telephone: (c = '#004A27') => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
  ),
  email: (c = '#004A27') => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
  ),
  horloge: (c = '#C8221A') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  personnes: (c = '#C8221A') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 15c3 0 5 2 5 5" /></svg>
  ),
  niveau: (c = '#C8221A') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 20V12M12 20V7M19 20V4" /></svg>
  )
};

// Illustration d'un emballage vu de dessus, avec autant d'œufs que la quantité (30 maximum dessinés)
export function Emballage({ quantite = 6, libelle = 'Boîte' }) {
  const n = Math.max(1, Math.min(quantite, 30));
  const cols = n <= 6 ? Math.min(n, 3) : n <= 12 ? Math.ceil(n / 2) : 6;
  const rangs = Math.ceil(n / cols);
  const pas = 24, marge = 12;
  const l = cols * pas + marge * 2, h = rangs * pas + marge * 2;
  const plateau = /plateau/i.test(libelle);
  const oeufs = [];
  for (let i = 0; i < n; i++) {
    const x = marge + (i % cols) * pas + pas / 2, y = marge + Math.floor(i / cols) * pas + pas / 2;
    oeufs.push(
      <g key={i}>
        <circle cx={x} cy={y} r={pas / 2 - 1} fill={plateau ? '#E9D3AE' : '#DCC398'} />
        <ellipse cx={x} cy={y - 1} rx={pas / 2 - 4} ry={pas / 2 - 3} fill="#FFFDF5" />
        <ellipse cx={x - 3} cy={y - 4} rx="2.2" ry="3" fill="#fff" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${l} ${h}`} width={l * 1.5} height={h * 1.5} className="emballage" role="img" aria-label={`${libelle} de ${quantite} œufs`}>
      <rect x="1" y="1" width={l - 2} height={h - 2} rx={plateau ? 10 : 6} fill={plateau ? '#F3E4C8' : '#E8D3AE'} stroke="#C9A877" strokeWidth="2" />
      {oeufs}
    </svg>
  );
}

// Petites étiquettes « 6 · 12 · 30 œufs » sous un produit
export function Quantites({ variantes }) {
  if (!variantes?.length) return null;
  const q = [...new Set(variantes.map((v) => v.quantite))].sort((a, b) => a - b);
  return (
    <span className="quantites" aria-label={`Disponible par ${q.join(', ')} œufs`}>
      {q.map((n) => <span key={n}>{n}</span>)}
      <em>œufs</em>
    </span>
  );
}
