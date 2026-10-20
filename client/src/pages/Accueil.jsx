import { Link } from 'react-router-dom';
import { useCharger } from '../useCharger.js';
import { Vague, EnteteSection, ProduitCarte, RecetteCarte, Traits, Icone } from '../components/Elements.jsx';
import { Revele, Compteur, OeufsFlottants, Souligne, BadgeTournant, BandeDefilante, Semis, Oiseau } from '../components/Decor.jsx';
import { SITE } from '../site.js';

const ENGAGEMENTS = [
  { titre: 'Qualité & sécurité', texte: 'Normes sanitaires et certifications respectées.', icone: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></> },
  { titre: 'Traçabilité totale', texte: 'De la ferme à l’assiette, chaque œuf est suivi.', icone: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" /></> },
  { titre: 'Agriculture durable', texte: 'Pratiques responsables, empreinte carbone réduite.', icone: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></> },
  { titre: 'Partenariat durable', texte: 'Une relation de confiance avec nos clients.', icone: <path d="M3 12l4-4 5 3 5-3 4 4-9 8z" /> }
];

const MOTS_BANDE = [
  { texte: 'Frais chaque jour' },
  { texte: 'Bien sûr Bnina !', script: true },
  { texte: 'Traçabilité totale' },
  { texte: 'Sfax · Grombalia · Djerba' },
  { texte: 'Riche en goût', script: true },
  { texte: 'De la ferme à l’assiette' }
];

export default function Accueil() {
  const produits = useCharger('/api/produits');
  const recettes = useCharger('/api/recettes?limit=3');

  return (
    <>
      <section className="heros">
        <div className="heros-fond" style={{ backgroundImage: 'url(/images/heros.jpg)' }} aria-hidden="true" />
        <OeufsFlottants />
        <Vague position="haut" />
        <div className="heros-contenu">
          <span className="script">Bien sûr Bnina !</span>
          <h1>Des œufs <Souligne>frais</Souligne> pour vous, chaque jour !</h1>
          <p>De nos élevages à votre table : qualité, fraîcheur et traçabilité totale.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Link to="/produits" className="btn btn-jaune" style={{ marginTop: 12 }}>Découvrir nos produits</Link>
            <a href="#apropos" className="defiler" aria-label="Défiler vers la suite" />
          </div>
        </div>
        <Vague position="bas" />
      </section>

      <section className="section" id="apropos" style={{ position: 'relative' }}>
        <Semis style={{ right: '6%', top: 60 }} />
        <div className="conteneur">
          <Revele><EnteteSection script="Bienvenue chez Ovolina" titre="Des œufs de qualité, de la ferme à votre table" /></Revele>
          <div className="deux-colonnes">
            <Revele sens="gauche" className="forme-organique">
              <div className="soleil soleil-anime" />
              <Traits style={{ position: 'absolute', top: 0, left: 0 }} />
              <div className="photo respire" style={{ backgroundImage: 'url(/images/apropos.jpg)' }} role="img" aria-label="Élevage Ovolina" />
              <BadgeTournant style={{ right: '2%', bottom: '2%' }} />
            </Revele>
            <div className="texte-bloc">
              <Revele delai={0}><p>Ovolina est une holding agro-industrielle engagée dans la production et l’emballage d’œufs de poule. Notre chaîne de valeur intégrée place la qualité, la traçabilité et la durabilité au cœur de notre métier.</p></Revele>
              <Revele delai={120} sens="droite" className="carte-ombre">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8221A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" /><path d="M5 19l7-7" /></svg>
                <div><strong>Élevages contrôlés</strong>Des poules élevées dans le respect du bien-être animal.</div>
              </Revele>
              <Revele delai={240} sens="droite" className="carte-ombre">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8221A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="7" width="13" height="10" rx="1" /><path d="M16 10h3l2 3v4h-5" /><circle cx="7" cy="18" r="1.8" /><circle cx="18" cy="18" r="1.8" /></svg>
                <div><strong>Livraison rapide et fiable</strong>Un réseau logistique optimisé pour garantir la fraîcheur.</div>
              </Revele>
              <Revele delai={360} style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <span className="pastille-icone">{Icone.telephone()}</span>
                <div>
                  <span className="script" style={{ display: 'block', fontSize: 24, color: 'var(--texte)' }}>Une commande ? Appelez-nous</span>
                  <a href={`tel:${SITE.telephoneLien}`} style={{ fontFamily: 'var(--titre)', fontWeight: 700, fontSize: 22, textDecoration: 'none' }}>{SITE.telephone}</a>
                </div>
              </Revele>
            </div>
          </div>
        </div>
      </section>

      <BandeDefilante mots={MOTS_BANDE} />

      <section className="section-grise">
        <div className="conteneur" style={{ paddingTop: 72, paddingBottom: 72 }}>
          <div className="engagements">
            {ENGAGEMENTS.map((e, i) => (
              <Revele key={e.titre} delai={i * 120}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#006838" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{e.icone}</svg>
                <strong>{e.titre}</strong>
                <span>{e.texte}</span>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ position: 'relative' }}>
        <Semis style={{ left: '4%', top: 90 }} couleur="#C8221A" />
        <div className="conteneur">
          <Revele><EnteteSection script="Notre gamme" titre="Nos produits" /></Revele>
          {produits.chargement && <p className="chargement">Chargement…</p>}
          {produits.donnees && (
            <div className="grille-produits">
              {produits.donnees.map((p, i) => (
                <Revele key={p.id} delai={i * 120} sens="zoom">
                  <ProduitCarte produit={p} />
                </Revele>
              ))}
            </div>
          )}
          <Revele className="centre" style={{ marginTop: 48 }}>
            <Link to="/produits" className="btn btn-jaune">Toute la gamme</Link>
          </Revele>
        </div>
      </section>

      <section className="bandeau bandeau-chiffres">
        <Vague position="haut" variante={1} />
        <div className="conteneur">
          <div className="entete-chiffres">
            <Revele sens="gauche">
              <span className="script">Ovolina en chiffres</span>
              <h2>Présents partout en Tunisie, de la grande distribution à la supérette de quartier.</h2>
            </Revele>
            <Revele sens="droite">
              <Link to="/contact" className="btn btn-jaune">Devenir revendeur</Link>
            </Revele>
          </div>
          <div className="stats">
            {SITE.chiffres.map((c, i) => (
              <Revele key={c.label} sens="zoom" delai={i * 130}>
                <div className="stat">
                  <Compteur valeur={c.valeur} suffixe={c.suffixe} />
                  <span className="label">{c.label}</span>
                  {c.detail && <span className="detail">{c.detail}</span>}
                  <Oiseau className="oiseau" />
                </div>
              </Revele>
            ))}
          </div>
        </div>
        <Vague position="bas" variante={1} />
      </section>

      {recettes.donnees?.length > 0 && (
        <section className="section">
          <div className="conteneur">
            <Revele><EnteteSection script="Inspirations culinaires" titre="Nos recettes favorites" /></Revele>
            <div className="grille-recettes">
              {recettes.donnees.map((r, i) => (
                <Revele key={r.id} delai={i * 150}><RecetteCarte recette={r} /></Revele>
              ))}
            </div>
            <Revele className="centre" style={{ marginTop: 48 }}>
              <Link to="/recettes" className="btn btn-jaune">Toutes les recettes</Link>
            </Revele>
          </div>
        </section>
      )}
    </>
  );
}
