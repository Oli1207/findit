import React from 'react'
import './videosidebar.css'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import MessageIcon from '@mui/icons-material/Message'
import ShareIcon from '@mui/icons-material/Share'


function VideoSidebar({shares, messages}) {
  return (
    <div className='videoSidebar'>
        <div className='videoSidebar__button'>
            <FavoriteIcon fontSize='large' />
        </div>
        <div className='videoSidebar__button'>
        <MessageIcon fontSize='large' />
        <p>{messages}</p>
        </div>
        <div className='videoSidebar__button'>
        <ShareIcon fontSize='large' />
        <p>99</p>
        </div>
    </div>
  )
}

export default VideoSidebar