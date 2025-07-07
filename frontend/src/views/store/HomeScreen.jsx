import React, { useRef, useState, useEffect } from 'react';
import './homescreen.css';
import apiInstance from '../../utils/axios';
import VideoFooter from './VideoFooter';
import VideoSidebar from './VideoSidebar';

function HomeScreen() {
  const [presentations, setPresentations] = useState([]);
  const videoRefs = useRef([]); // tableau de refs

  useEffect(() => {
    apiInstance.get('presentations/')
      .then((response) => {
        setPresentations(response.data);
        console.log(response.data);
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des présentations :', error);
      });
  }, []);

  const handleVideoPress = (index) => {
    const video = videoRefs.current[index];
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className='app__videos'>
      {presentations.map((presentation, index) => (
        <div className='video' key={index}>
          <video
            src={presentation.video}
            className='video__player'
            onClick={() => handleVideoPress(index)}
            ref={(el) => (videoRefs.current[index] = el)}
          />
          <VideoFooter/>
          <VideoSidebar/>
        </div>
      ))}
    </div>
  );
}

export default HomeScreen;
