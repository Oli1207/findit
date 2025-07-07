import React, { useRef, useState, useEffect } from 'react';
import apiInstance from '../../utils/axios';
import './videofooter.css';
import MusicNoteIcon from '@mui/icons-material/MusicNote'

function VideoFooter() {
  const [presentations, setPresentations] = useState([]);

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

  return (
    <>
      {presentations.map((presentation, index) => (
        <div className='videoFooter' key={index}>
          <div className='videoFooter__text'>
            <h3>{presentation.title}</h3>
            <p>{presentation.description}</p>
            <div className='videoFooter__ticker'>
                <MusicNoteIcon
                className="videoFooter__icon"
                 />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default VideoFooter;
