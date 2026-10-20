// Affiche le texte d'un article écrit avec une mise en forme simple :
//   ## Intertitre        ### Petit intertitre
//   - élément de liste   > citation
//   **gras**   *italique*   [texte du lien](https://adresse)
// Une ligne vide sépare les paragraphes. Aucun HTML n'est interprété : le texte est sûr.

function enLigne(texte, cle = 'x') {
  const morceaux = [];
  const motif = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let dernier = 0, m, i = 0;
  while ((m = motif.exec(texte))) {
    if (m.index > dernier) morceaux.push(texte.slice(dernier, m.index));
    const k = `${cle}-${i++}`;
    if (m[1]) morceaux.push(<strong key={k}>{enLigne(m[1], k)}</strong>);
    else if (m[2]) morceaux.push(<em key={k}>{enLigne(m[2], k)}</em>);
    else {
      const externe = m[4].startsWith('http');
      morceaux.push(<a key={k} href={m[4]} {...(externe ? { target: '_blank', rel: 'noreferrer' } : {})}>{m[3]}</a>);
    }
    dernier = motif.lastIndex;
  }
  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return morceaux;
}

export function enBlocs(texte) {
  const lignes = String(texte || '').replace(/\r/g, '').split('\n');
  const blocs = [];
  let para = [], liste = null;
  const finirPara = () => { if (para.length) { blocs.push({ type: 'p', texte: para.join(' ') }); para = []; } };
  const finirListe = () => { if (liste) { blocs.push({ type: 'ul', items: liste }); liste = null; } };

  for (const brute of lignes) {
    const l = brute.trim();
    if (!l) { finirPara(); finirListe(); continue; }
    if (/^#{2,3}\s/.test(l)) { finirPara(); finirListe(); blocs.push({ type: l.startsWith('###') ? 'h3' : 'h2', texte: l.replace(/^#{2,3}\s+/, '') }); continue; }
    if (/^[-•*]\s/.test(l)) { finirPara(); (liste ||= []).push(l.replace(/^[-•*]\s+/, '')); continue; }
    if (/^>\s?/.test(l)) { finirPara(); finirListe(); blocs.push({ type: 'cite', texte: l.replace(/^>\s?/, '') }); continue; }
    finirListe();
    para.push(l);
  }
  finirPara(); finirListe();
  return blocs;
}

export default function Contenu({ texte }) {
  return (
    <div className="contenu-article">
      {enBlocs(texte).map((b, i) => {
        const k = `b${i}`;
        if (b.type === 'h2') return <h2 key={k}>{enLigne(b.texte, k)}</h2>;
        if (b.type === 'h3') return <h3 key={k}>{enLigne(b.texte, k)}</h3>;
        if (b.type === 'ul') return <ul key={k}>{b.items.map((it, j) => <li key={j}>{enLigne(it, `${k}-${j}`)}</li>)}</ul>;
        if (b.type === 'cite') return <blockquote key={k}>{enLigne(b.texte, k)}</blockquote>;
        return <p key={k}>{enLigne(b.texte, k)}</p>;
      })}
    </div>
  );
}
