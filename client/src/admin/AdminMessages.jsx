import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api.js';
import { useCharger } from '../useCharger.js';

const ONGLETS = ['Tous', 'Nouveaux', 'Traités'];
const date = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminMessages() {
  const { donnees, chargement, erreur } = useCharger('/api/admin/messages');
  const { rafraichirCompteur } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [filtre, setFiltre] = useState('Tous');
  const [selId, setSelId] = useState(null);
  const [alerte, setAlerte] = useState(null);

  useEffect(() => {
    if (donnees) {
      setMessages(donnees);
      setSelId((s) => s ?? donnees[0]?.id ?? null);
    }
  }, [donnees]);

  const liste = useMemo(
    () => messages.filter((m) => filtre === 'Tous' || (filtre === 'Nouveaux' ? !m.traite : m.traite)),
    [messages, filtre]
  );
  const sel = messages.find((m) => m.id === selId) || null;

  async function basculer(m) {
    try {
      const maj = await api.patch(`/api/admin/messages/${m.id}`, { traite: !m.traite });
      setMessages((ms) => ms.map((x) => (x.id === m.id ? maj : x)));
      rafraichirCompteur();
    } catch (err) { setAlerte(err.message); }
  }

  async function supprimer(m) {
    if (!window.confirm(`Supprimer définitivement le message de ${m.nom} ?`)) return;
    try {
      await api.del(`/api/admin/messages/${m.id}`);
      setMessages((ms) => ms.filter((x) => x.id !== m.id));
      setSelId(null);
      rafraichirCompteur();
    } catch (err) { setAlerte(err.message); }
  }

  return (
    <>
      <div className="admin-titre">
        <div>
          <h1>Messages</h1>
          <span className="sous">Reçus via le formulaire de contact</span>
        </div>
        <div className="onglets" role="group" aria-label="Filtrer les messages">
          {ONGLETS.map((o) => (
            <button key={o} type="button" aria-pressed={filtre === o} onClick={() => setFiltre(o)}>{o}</button>
          ))}
        </div>
      </div>

      {alerte && <p className="alerte alerte-erreur" role="alert">{alerte}</p>}
      {chargement && <p className="chargement">Chargement…</p>}
      {erreur && <p className="alerte alerte-erreur">{erreur.message}</p>}

      {donnees && (
        <div className="messagerie">
          <div className="liste-messages">
            {liste.map((m) => (
              <button key={m.id} type="button" aria-current={m.id === selId} onClick={() => setSelId(m.id)}>
                <span className="l1"><strong>{m.nom}</strong><span>{date(m.recu_le)}</span></span>
                <span className="l2">
                  <span className={`pilule ${m.traite ? 'pilule-ok' : 'pilule-nouveau'}`}>{m.traite ? 'Traité' : 'Nouveau'}</span>
                  <span>{m.profil}</span>
                </span>
                <span className="extrait">{m.message}</span>
              </button>
            ))}
            {liste.length === 0 && <p className="vide" style={{ margin: 0 }}>Aucun message dans cette catégorie.</p>}
          </div>

          {sel && (
            <article className="detail-message">
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h2>{sel.nom}</h2>
                  <span style={{ color: 'var(--gris)' }}>{sel.email}{sel.telephone ? ` · ${sel.telephone}` : ''}</span>
                </div>
                <span className={`pilule ${sel.traite ? 'pilule-ok' : 'pilule-nouveau'}`}>{sel.traite ? 'Traité' : 'Nouveau'}</span>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, color: 'var(--gris)' }}>
                <span>Reçu le {date(sel.recu_le)}</span><span>{sel.profil}</span>
              </div>
              <p className="corps">{sel.message}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <a className="btn btn-jaune" href={`mailto:${sel.email}?subject=${encodeURIComponent('Votre message à Ovolina')}`}>Répondre par email</a>
                <button type="button" className="btn btn-contour" onClick={() => basculer(sel)}>
                  {sel.traite ? 'Marquer comme nouveau' : 'Marquer comme traité'}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => supprimer(sel)}>Supprimer</button>
              </div>
            </article>
          )}
        </div>
      )}
    </>
  );
}
