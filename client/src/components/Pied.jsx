import { Link } from 'react-router-dom';
import { SITE } from '../site.js';
import { useCharger } from '../useCharger.js';
import { Oiseau, Revele } from './Decor.jsx';

const ICONES_RESEAUX = {
  facebook: { nom: 'Facebook', d: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z' },
  instagram: { nom: 'Instagram', d: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  linkedin: { nom: 'LinkedIn', d: 'M5 9h3.5v11H5zM6.7 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10.5 9H14v1.6c.5-.9 1.7-1.9 3.6-1.9 3.6 0 4.4 2.3 4.4 5.4V20h-3.5v-5.1c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20h-3.5z' },
  youtube: { nom: 'YouTube', d: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z' }
};

const Pastille = ({ children }) => <span className="pied-icone" aria-hidden="true">{children}</span>;
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Paysage dessiné en bas du pied de page : collines, soleil, nid d'œufs, oiseaux qui passent
function Paysage() {
  return (
    <svg className="paysage" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g className="soleil-pied">
        <circle cx="1180" cy="120" r="54" fill="#F8C800" />
        <g className="rayons" stroke="#F8C800" strokeWidth="6" strokeLinecap="round">
          <path d="M1180 40v-22M1180 222v-20M1100 120h-22M1282 120h-22M1123 63l-15-15M1252 192l-15-15M1237 63l15-15M1108 192l15-15" />
        </g>
      </g>
      <g className="oiseaux" fill="none" stroke="#B9D3C1" strokeWidth="3" strokeLinecap="round">
        <path className="vol vol-1" d="M300 70 q10 -10 20 0 q10 -10 20 0" />
        <path className="vol vol-2" d="M360 50 q7 -7 14 0 q7 -7 14 0" />
        <path className="vol vol-3" d="M330 95 q6 -6 12 0 q6 -6 12 0" />
      </g>
      <path d="M0 150 C 180 96, 380 110, 560 140 S 900 96, 1100 128 S 1340 110, 1440 124 V220 H0 Z" fill="#0B5E33" />
      <path d="M0 176 C 220 140, 420 150, 640 170 S 1000 140, 1200 160 S 1380 150, 1440 156 V220 H0 Z" fill="#11713E" />
      <g stroke="#D9C49A" strokeWidth="5" strokeLinecap="round" opacity=".85">
        <path d="M120 176v-30M170 172v-30M220 170v-30M270 170v-30M320 171v-30" />
        <path d="M112 152h216M112 164h216" strokeWidth="4" />
      </g>
      <g className="nid">
        <ellipse cx="760" cy="168" rx="58" ry="14" fill="#C88A3A" />
        <ellipse cx="736" cy="152" rx="15" ry="19" fill="#FFFDF5" />
        <ellipse cx="764" cy="148" rx="16" ry="21" fill="#FFF3D6" />
        <ellipse cx="790" cy="154" rx="14" ry="18" fill="#FFFDF5" />
        <path d="M704 166 q56 22 112 0" fill="none" stroke="#A86E26" strokeWidth="5" strokeLinecap="round" />
      </g>
      <path d="M0 196 C 260 176, 520 186, 760 194 S 1200 176, 1440 188 V220 H0 Z" fill="#004A27" />
    </svg>
  );
}

export default function Pied() {
  const produits = useCharger('/api/produits');
  const reseaux = Object.entries(SITE.reseaux || {}).filter(([cle, url]) => url && ICONES_RESEAUX[cle]);

  return (
    <footer className="pied2">
      <div className="conteneur pied-appel">
        <Revele className="appel-carte">
          <div className="appel-texte">
            <span className="script">Professionnels</span>
            <h2>Devenez revendeur Ovolina</h2>
            <p>Grande distribution, supérettes, restauration : des œufs frais livrés partout en Tunisie.</p>
          </div>
          <div className="appel-actions">
            <a href={`tel:${SITE.telephoneLien}`} className="appel-tel">
              <Pastille><svg width="20" height="20" viewBox="0 0 24 24" {...trait}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></Pastille>
              {SITE.telephone}
            </a>
            <Link to="/contact" className="btn btn-vert">Demander un devis</Link>
          </div>
          <Oiseau className="appel-oiseau" />
        </Revele>
      </div>

      <div className="pied-corps">
        <svg className="vague" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0H1440V14C1160 28 900 4 640 18S200 26 0 10Z" fill="#fff" />
        </svg>

        <div className="conteneur pied-grille">
          <div className="pied-marque">
            <Link to="/" className="pied-logo" aria-label="Ovolina, accueil"><img src="/logo.png" alt="Ovolina – Bien sûr Bnina !" width="165" height="72" /></Link>
            <p>Holding agro-industrielle tunisienne : production, conditionnement et distribution d’œufs frais, sains et traçables.</p>
            {reseaux.length > 0 && (
              <div className="pied-reseaux">
                {reseaux.map(([cle, url]) => (
                  <a key={cle} href={url} target="_blank" rel="noreferrer" aria-label={ICONES_RESEAUX[cle].nom}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICONES_RESEAUX[cle].d} /></svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav className="pied-colonne" aria-label="Nos produits">
            <h3>Nos produits</h3>
            {(produits.donnees || []).map((p) => (
              <Link key={p.id} to={`/produits/${p.slug}`}><span className="puce" aria-hidden="true" />{p.nom}</Link>
            ))}
            <Link to="/produits" className="tout">Toute la gamme →</Link>
          </nav>

          <nav className="pied-colonne" aria-label="Pages du site">
            <h3>Le site</h3>
            <Link to="/"><span className="puce" aria-hidden="true" />Accueil</Link>
            <Link to="/#apropos"><span className="puce" aria-hidden="true" />Qui sommes-nous</Link>
            <Link to="/recettes"><span className="puce" aria-hidden="true" />Nos recettes</Link>
            <Link to="/contact"><span className="puce" aria-hidden="true" />Contact</Link>
          </nav>

          <div className="pied-colonne pied-contact">
            <h3>Nous joindre</h3>
            <a href={`tel:${SITE.telephoneLien}`}>
              <Pastille><svg width="16" height="16" viewBox="0 0 24 24" {...trait}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></Pastille>
              {SITE.telephone}
            </a>
            <a href={`mailto:${SITE.email}`}>
              <Pastille><svg width="16" height="16" viewBox="0 0 24 24" {...trait}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></Pastille>
              {SITE.email}
            </a>
            {SITE.sites.map((s) => (
              <div className="pied-site" key={s.ville}>
                <Pastille><svg width="16" height="16" viewBox="0 0 24 24" {...trait}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg></Pastille>
                <span><strong>{s.ville}</strong>{s.adresse}</span>
              </div>
            ))}
          </div>
        </div>

        <Paysage />

        <div className="pied-bas">
          <div className="conteneur">
            <span>© {new Date().getFullYear()} Ovolina. Tous droits réservés.</span>
            <span className="script">Bien sûr Bnina !</span>
            <Link to="/admin">Espace administration</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
