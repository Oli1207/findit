import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import './tiktokfeed.css'

// Ce composant gérera son propre état de swipe
const ProductSlider = ({ item }) => {
  // 1. Gérer l'index actuel localement
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 2. Définir les images et le total
  const images = [item.image, ...(item.gallery || [])];
  const totalImages = images.length;

  // 3. Appeler useSwipeable, qui utilise l'état local
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // Met à jour l'index local, en s'assurant de ne pas dépasser le total
      setCurrentIndex((prev) => Math.min(prev + 1, totalImages - 1));
    },
    onSwipedRight: () => {
      // Met à jour l'index local, en s'assurant de ne pas aller en dessous de 0
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    },
    trackMouse: true, // Permet de swiper avec la souris sur ordinateur
  });

  // 4. Retourner le JSX du slider
  // Le conteneur principal garde la classe 'feed-image' pour le positionnement absolu
  return (
    <div className="feed-image">
      <div
        {...handlers} // Applique les gestionnaires de swipe ici
        className="feed-slider"
        style={{
          display: 'flex',
          transform: `translateX(-${currentIndex * 100}%)`, // Déplace le slider
          transition: 'transform 0.3s ease',
          width: '100%',
          height: '100%',
        }}
      >
        {images.map((img, imgIndex) => (
          <img
            key={imgIndex}
            src={img}
            className="feed-slide-image"
            alt={item.title}
          />
        ))}
      </div>

      {/* 5. Les points de navigation (dots) */}
      <div className="feed-dots">
        {images.map((_, imgIndex) => (
          <span
            key={imgIndex}
            // La classe 'active' dépend maintenant de 'currentIndex'
            className={`feed-dot ${currentIndex === imgIndex ? 'active' : ''}`}
            // Permet de cliquer sur les points
            onClick={() => setCurrentIndex(imgIndex)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductSlider;