import { useSwipeable } from 'react-swipeable';
import React, { useState } from 'react';

const SwipeableGallery = ({ images, title }) => {
  const [index, setIndex] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: () => setIndex((prev) => Math.min(prev + 1, images.length - 1)),
    onSwipedRight: () => setIndex((prev) => Math.max(prev - 1, 0)),
    trackMouse: true,
  });

  return (
    <div>
      <div
        {...handlers}
        className="ig-slide-container"
        style={{
          transform: `translateX(-${index * 100}%)`,
          display: 'flex',
          transition: 'transform 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={title}
            style={{ width: '100%', flexShrink: 0 }}
          />
        ))}
      </div>
      <div className="ig-dots">
        {images.map((_, i) => (
          <span
            key={i}
            className={`ig-dot ${index === i ? 'active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipeableGallery;
