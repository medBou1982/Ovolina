import { useEffect, useRef, useState } from 'react';

const sansMouvement = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fait apparaître son contenu quand il entre à l'écran.
// sens : "" (monte), "gauche", "droite", "zoom" · delai en ms
export function Revele({ children, sens = '', delai = 0, as: Balise = 'div', className = '', style, ...reste }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (sansMouvement() || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const obs = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Balise
      ref={ref}
      className={`revele ${sens} ${visible ? 'visible' : ''} ${className}`.trim()}
      style={{ ...style, '--delai': `${delai}ms` }}
      {...reste}
    >
      {children}
    </Balise>
  );
}

// Nombre qui défile de 0 à sa valeur quand il apparaît
export function Compteur({ valeur, duree = 1400 }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (sansMouvement() || !('IntersectionObserver' in window)) { setN(valeur); return; }
    let raf;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const debut = performance.now();
      const pas = (t) => {
        const p = Math.min((t - debut) / duree, 1);
        setN(Math.round(valeur * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(pas);
      };
      raf = requestAnimationFrame(pas);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [valeur, duree]);

  return <strong ref={ref} aria-label={String(valeur)}>{n}</strong>;
}

function PetitOeuf({ jaune = '#F8C800', taille = 40 }) {
  return (
    <svg width={taille} height={taille * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <path d="M20 2C10 2 3 18 3 30a17 17 0 0 0 34 0C37 18 30 2 20 2z" fill="#FFFDF5" />
      <circle cx="20" cy="31" r="8.5" fill={jaune} />
      <ellipse cx="13" cy="16" rx="3" ry="5" fill="#fff" opacity=".7" transform="rotate(20 13 16)" />
    </svg>
  );
}

// Œufs qui flottent doucement en arrière-plan du héros
const OEUFS = [
  { left: '6%', top: '22%', t: 46, d: '9s', r: '-12deg', delai: '0s', j: '#F8C800' },
  { left: '14%', top: '68%', t: 30, d: '11s', r: '10deg', delai: '-3s', j: '#EE8A1C' },
  { left: '84%', top: '18%', t: 38, d: '10s', r: '14deg', delai: '-5s', j: '#F8C800' },
  { left: '90%', top: '62%', t: 54, d: '12s', r: '-8deg', delai: '-2s', j: '#F2A20C' },
  { left: '74%', top: '80%', t: 24, d: '8s', r: '6deg', delai: '-6s', j: '#F8C800' }
];
export function OeufsFlottants() {
  return (
    <div className="oeufs-flottants" aria-hidden="true">
      {OEUFS.map((o, i) => (
        <span key={i} style={{ left: o.left, top: o.top, '--duree': o.d, '--rot': o.r, '--retard': o.delai }}>
          <PetitOeuf taille={o.t} jaune={o.j} />
        </span>
      ))}
    </div>
  );
}

// Mot souligné d'un coup de pinceau qui se dessine
export function Souligne({ children, couleur = '#F8C800' }) {
  return (
    <span className="souligne">
      {children}
      <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 14 C 50 4, 120 4, 197 10" fill="none" stroke={couleur} strokeWidth="7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// Badge rond avec texte qui tourne autour d'un œuf
export function BadgeTournant({ texte = 'Bien sûr Bnina • Frais chaque jour • ', style }) {
  return (
    <div className="badge-tournant" style={style} aria-hidden="true">
      <svg className="texte" viewBox="0 0 150 150">
        <defs><path id="cercle-badge" d="M75 75 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" /></defs>
        <circle cx="75" cy="75" r="74" fill="#004A27" />
        <text fill="#F8C800" style={{ fontFamily: 'var(--titre)', fontWeight: 700, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' }}>
          <textPath href="#cercle-badge" textLength="360" lengthAdjust="spacing">{texte}</textPath>
        </text>
      </svg>
      <div className="centre-badge"><PetitOeuf taille={38} /></div>
    </div>
  );
}

// Bande jaune inclinée qui défile en continu
export function BandeDefilante({ mots }) {
  const contenu = mots.map((m, i) => (
    <span key={i}>
      {m.script ? <em className="script-inline">{m.texte}</em> : m.texte}
      <PetitOeuf taille={22} jaune="#EE8A1C" />
    </span>
  ));
  return (
    <div className="bande-defilante" aria-hidden="true">
      <div className="piste">{contenu}{contenu}</div>
    </div>
  );
}

// Petits points semés, comme des graines
export function Semis({ style, couleur = '#F8C800' }) {
  const points = [[10, 8], [34, 20], [18, 36], [52, 6], [60, 32], [40, 48], [8, 58], [70, 54]];
  return (
    <svg className="semis" width="80" height="70" viewBox="0 0 80 70" style={style} aria-hidden="true">
      {points.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.2" ry="5" fill={couleur} transform={`rotate(${i * 37} ${x} ${y})`} />)}
    </svg>
  );
}

// Bouton rond qui ramène en haut de la page
export function HautDePage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const surDefilement = () => setVisible(window.scrollY > 600);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);
  return (
    <button
      type="button"
      className={`haut-de-page${visible ? ' visible' : ''}`}
      aria-label="Revenir en haut de la page"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: sansMouvement() ? 'auto' : 'smooth' })}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6" /></svg>
    </button>
  );
}
