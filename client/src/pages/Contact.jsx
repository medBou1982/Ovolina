import { useState } from 'react';
import { api } from '../api.js';
import { Revele } from '../components/Decor.jsx';
import { Banniere, Icone } from '../components/Elements.jsx';
import { SITE } from '../site.js';

const VIDE = { nom: '', telephone: '', email: '', profil: 'Particulier', message: '', site: '' };

export default function Contact() {
  const [form, setForm] = useState(VIDE);
  const [etat, setEtat] = useState({ envoi: false, ok: false, erreur: null, erreurs: {} });

  const champ = (nom) => ({
    name: nom,
    value: form[nom],
    onChange: (e) => setForm((f) => ({ ...f, [nom]: e.target.value }))
  });

  async function envoyer(e) {
    e.preventDefault();
    setEtat({ envoi: true, ok: false, erreur: null, erreurs: {} });
    try {
      await api.post('/api/contact', form);
      setForm(VIDE);
      setEtat({ envoi: false, ok: true, erreur: null, erreurs: {} });
    } catch (err) {
      setEtat({ envoi: false, ok: false, erreur: err.message, erreurs: err.details || {} });
    }
  }

  return (
    <>
      <Banniere titre="Contact" ariane={[{ label: 'Contact' }]} />

      <section className="section">
        <div className="conteneur deux-colonnes" style={{ alignItems: 'flex-start' }}>
          <div className="texte-bloc" style={{ gap: 24 }}>
            <span className="script">Nous sommes à votre écoute</span>
            <h2>Une question, une commande professionnelle ?</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="pastille-icone">{Icone.telephone()}</span>
              <div>
                <span style={{ display: 'block', color: 'var(--gris)', fontSize: 14 }}>Téléphone</span>
                <a href={`tel:${SITE.telephoneLien}`} style={{ fontFamily: 'var(--titre)', fontWeight: 700, fontSize: 22, textDecoration: 'none' }}>{SITE.telephone}</a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="pastille-icone">{Icone.email()}</span>
              <div>
                <span style={{ display: 'block', color: 'var(--gris)', fontSize: 14 }}>Email</span>
                <a href={`mailto:${SITE.email}`} style={{ fontFamily: 'var(--titre)', fontWeight: 700, fontSize: 22, textDecoration: 'none' }}>{SITE.email}</a>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <strong style={{ fontFamily: 'var(--titre)', fontSize: 20, color: 'var(--vert)' }}>Nos sites</strong>
              {SITE.sites.map((s) => (
                <Revele className="site-carte" key={s.ville} delai={SITE.sites.indexOf(s) * 120}><strong>{s.ville}</strong><span>{s.adresse}</span></Revele>
              ))}
            </div>
          </div>

          <Revele as="form" sens="droite" className="formulaire-contact" onSubmit={envoyer} noValidate>
            <h3>Envoyez-nous un message</h3>
            {etat.ok && <p className="alerte alerte-ok" role="status">Merci ! Votre message a bien été envoyé, nous vous répondrons rapidement.</p>}
            {etat.erreur && <p className="alerte alerte-erreur" role="alert">{etat.erreur}</p>}
            <div className="ligne-champs">
              <label className="champ">Nom complet
                <input type="text" autoComplete="name" required {...champ('nom')} aria-invalid={!!etat.erreurs.nom} />
                {etat.erreurs.nom && <span className="erreur">{etat.erreurs.nom}</span>}
              </label>
              <label className="champ">Téléphone
                <input type="tel" autoComplete="tel" placeholder="+216" {...champ('telephone')} />
              </label>
            </div>
            <label className="champ">Email
              <input type="email" autoComplete="email" required {...champ('email')} aria-invalid={!!etat.erreurs.email} />
              {etat.erreurs.email && <span className="erreur">{etat.erreurs.email}</span>}
            </label>
            <label className="champ">Vous êtes
              <select {...champ('profil')}>
                <option value="Particulier">Particulier</option>
                <option value="Professionnel">Professionnel (distribution, restauration…)</option>
                <option value="Autre">Autre</option>
              </select>
            </label>
            <label className="champ">Message
              <textarea rows={5} required {...champ('message')} aria-invalid={!!etat.erreurs.message} />
              {etat.erreurs.message && <span className="erreur">{etat.erreurs.message}</span>}
            </label>
            <label className="piege" aria-hidden="true">Site web<input type="text" tabIndex={-1} autoComplete="off" {...champ('site')} /></label>
            <button type="submit" className="btn btn-jaune" style={{ alignSelf: 'flex-start' }} disabled={etat.envoi}>
              {etat.envoi ? 'Envoi…' : 'Envoyer'}
            </button>
          </Revele>
        </div>
      </section>
    </>
  );
}
