// src/components/vendor/PresentationVideo.jsx
import React from "react";

const PresentationVideo = ({
  item,
  index,
  setVideoRef,
  onLike,
  onCommentIconClick,
}) => {
  return (
    <div
      className="feed-item"
      data-id={`presentation-${item.id}`}
    >
      <video
        ref={(el) => setVideoRef(el, index)}
        src={item.video}
        className="feed-image"
        loop
        playsInline
        muted
        onClick={(e) => {
          const video = e.target;
          if (video.paused) {
            video.muted = false;
            const playPromise = video.play();
            if (playPromise && playPromise.catch) {
              playPromise.catch(() => {});
            }
          } else {
            video.pause();
          }
        }}
        style={{ cursor: "pointer" }}
      />

      <div className="overlay"></div>

      <div className="info">
        <h3
          style={{
            textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
            color: "white",
          }}
        >
          {item.vendor?.name}
        </h3>
        <h2
          style={{
            textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
            color: "white",
          }}
        >
          {item.title}
        </h2>
        <p
          style={{
            textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
            color: "white",
          }}
        >
          {item.description}
        </p>
      </div>

      <div className="actions">
        <div
          className="action-btn"
          style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
          onClick={() => onLike(item.id)}
        >
          <i className="fas fa-heart" /> {item.likes_count}
        </div>

        <div
          className="action-btn"
          style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
          onClick={() => onCommentIconClick(item)}
        >
          <i className="fas fa-comment-dots" /> {item.comments_count}
        </div>
      </div>
    </div>
  );
};

export default PresentationVideo;
