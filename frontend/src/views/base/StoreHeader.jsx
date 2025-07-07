import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import logo from '../../assets/findit_logoo.png';
import UserData from '../plugin/UserData';
import apiInstance from '../../utils/axios';
import './storeheader.css'

function StoreHeader() {
  const [isLoggedIn, user] = useAuthStore((state) => [state.isLoggedIn, state.user]);
  const [profile, setProfile] = useState({});
  const [search, setSearch] = useState("");
  const [isHeaderVisible, setIsHeaderVisible] = useState(true); 
  const navigate = useNavigate();
  const navbarRef = useRef(null);

  const handleSearchChange = (event) => setSearch(event.target.value);
  const handleSearchSubmit = () => navigate(`/search?query=${search}`);

  useEffect(() => {
    if (UserData()?.user_id) {
      apiInstance.get(`user/profile/${UserData().user_id}/`).then((res) => setProfile(res.data));
    }

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsHeaderVisible(false); // Masquer si on descend
      } else {
        setIsHeaderVisible(true); // Afficher si on remonte
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      ref={navbarRef} 
      className={`navbar navbar-expand-lg store-navbar ${isHeaderVisible ? 'visible' : 'hidden'}`} 
      style={{ 
        backgroundColor: '#C3EBFF', 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        transition: 'transform 0.3s ease-in-out', 
        transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
        zIndex: 1000,
        marginBottom:'800px',
      }}
    >
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src={logo} alt="Logo" style={{ width: '150px', height: '100px' }} />
        </Link>
        <form className="d-flex justify-content-center" style={{ flexGrow: 1 }}>
          <input 
            className="form-control me-2" 
            type="text" 
            placeholder="chemise, jean..." 
            onChange={handleSearchChange} 
            style={{ maxWidth: '600px', width: '100%' }} 
          />
          <button type='button' onClick={handleSearchSubmit} className="btn btn-outline-success me-2">
            Rechercher
          </button>
        </form>
        <div className="d-flex align-items-center">
          {isLoggedIn() ? (
            <>
              <Link className="btn btn-outline-danger me-2" to="/add-product">
                <i className="fas fa-plus"></i>
              </Link>
              <div className="dropdown">
                <button className="btn p-0 dropdown-toggle" type="button" id="profileDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                  <img src={profile?.image || 'https://via.placeholder.com/50'} alt="Profile" className="rounded-circle" style={{ width: '50px', height: '50px' }} />
                </button>
                <ul className="dropdown-menu" aria-labelledby="profileDropdown">
                  <li><Link className="dropdown-item" to="/customer/account/">Account</Link></li>
                  <li><Link className="dropdown-item" to="/vendor/dashboard/">Vendeur</Link></li>
                  <li><Link className="dropdown-item" to="/logout">Logout</Link></li>
                </ul>
              </div>
            </>
          ) : (
            <Link className="btn btn-primary me-2" to="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default StoreHeader;
