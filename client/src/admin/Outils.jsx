// Boutons monter / descendre / supprimer d'une ligne de liste
export default function Outils({ index, total, onBouger, onSupprimer, nom }) {
  return (
    <span className="outils-ligne">
      <button type="button" className="btn-petit btn-icone" aria-label={`Monter ${nom}`} disabled={index === 0} onClick={() => onBouger(index, -1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6" /></svg>
      </button>
      <button type="button" className="btn-petit btn-icone" aria-label={`Descendre ${nom}`} disabled={index === total - 1} onClick={() => onBouger(index, 1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 10l6 6 6-6" /></svg>
      </button>
      <button type="button" className="btn-petit btn-icone" aria-label={`Supprimer ${nom}`} onClick={() => onSupprimer(index)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
      </button>
    </span>
  );
}
