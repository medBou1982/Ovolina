import { useState } from 'react';
import { Oiseau } from './Decor.jsx';

// Story vidéo d'une recette (YouTube Shorts, format vertical 9:16).
// Avant le clic : une vignette façon story aux couleurs Ovolina, sans aucun lien visible.
// Après le clic : la vidéo se lance directement dans le cadre.
export default function VideoRecette({ id, titre }) {
  const [lecture, setLecture] = useState(false);
  if (!id) return null;

  return (
    <div className="story">
      {lecture ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&loop=1&playlist=${id}`}
          title={`Story : ${titre}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="story-vignette" onClick={() => setLecture(true)} aria-label={`Lire la story de la recette : ${titre}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="story-voile" aria-hidden="true" />
          <span className="story-barres" aria-hidden="true"><i /><i /><i /></span>
          <span className="story-auteur" aria-hidden="true">
            <span className="story-avatar"><Oiseau /></span>
            <strong>Ovolina</strong>
          </span>
          <span className="story-lecture" aria-hidden="true">
            <svg viewBox="0 0 40 48" width="64" height="76">
              <path d="M20 2C10 2 3 18 3 30a17 17 0 0 0 34 0C37 18 30 2 20 2z" fill="#F8C800" />
              <path d="M15 21v20l15-10z" fill="#004A27" />
            </svg>
          </span>
          <span className="story-texte" aria-hidden="true">
            <span className="script">En story</span>
            <strong>{titre}</strong>
          </span>
        </button>
      )}
    </div>
  );
}
