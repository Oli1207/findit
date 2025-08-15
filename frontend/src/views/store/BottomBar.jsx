import React from 'react'
import './tiktokfeed.css'
import { Link } from 'react-router-dom'

function BottomBar() {
  return (
      <div className="bottom-bar">
            <div className="nav-item">
              <Link
                to="/"
                className="text-decoration-none text-white"
              >
                <i className="fas fa-home"></i>
                <br />
                accueil
              </Link>
            </div>
            <div className="nav-item add-btn">
              <Link to="/add-product" className="text-decoration-none text-white">
                <i class="fas fa-plus"></i>
              </Link>
            </div>
            <div className="nav-item">
              <Link
                to="/profile/"
                className="text-decoration-none text-white"
              >
          <i class="fas fa-user"></i>
                <br />
                profil 
                 {/* <InstallButton /> */}
              </Link>
            </div>
          </div>
  )
}

export default BottomBar