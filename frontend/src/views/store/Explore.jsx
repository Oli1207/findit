import React, { useEffect, useState } from 'react';
import apiInstance from '../../utils/axios';

function Explore() {
  const [presentations, setPresentations] = useState([]);

  useEffect(() => {
    apiInstance.get('presentations/')
      .then((response) => {
        setPresentations(response.data);
        console.log(response.data);
      });
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    };

    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          // Pause all other videos
          document.querySelectorAll('video').forEach(v => {
            if (v !== video) {
              v.pause();
            }
          });
          video.play();
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
      observer.observe(video);
    });

    return () => {
      videos.forEach(video => {
        observer.unobserve(video);
      });
    };
  }, [presentations]);

  const handleVideoClick = (e) => {
    const video = e.target;
    const button = video.nextSibling;

    if (video.paused) {
      video.play();
      button.classList.add('hidden');
    } else {
      video.pause();
      button.classList.remove('hidden');
    }
  };

  return (
    <div>
      <div className="d-flex flex-column align-items-center">
        {presentations?.map((presentation, index) => (
          <div className="mb-4 video-container" key={index} style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
            <div className="card">
              <div className="bg-image hover-zoom ripple" data-mdb-ripple-color="light" style={{ position: 'relative' }}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', width: '100%' }}>
                  <video
                    src={presentation.video}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    alt={presentation.title}
                    muted
                    onClick={handleVideoClick}
                  />
                  <div
                    className="play-pause-button"
                    onClick={handleVideoClick}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '3rem',
                      color: 'white',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '50%',
                      padding: '0.5rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transition: 'opacity 0.3s ease',
                      zIndex: 1,
                    }}
                  >
                    &#9658;
                  </div>
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  color: 'white',
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '10px',
                  borderRadius: '5px',
                }}>
                    <h6>{presentation.user.username}</h6>
                  <h2>{presentation.title}</h2>
                  <p>{presentation.description}</p>
                  <a href={presentation.link} style={{ color: 'white' }}>{presentation.link}</a>
                </div>
              </div>
              <div className="hover-overlay">
                <div className="mask" style={{ backgroundColor: 'rgba(251, 251, 251, 0.15)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Explore;
