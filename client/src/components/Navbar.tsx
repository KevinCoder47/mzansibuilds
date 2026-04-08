import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          MzansiBuilds
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link
            to="/feed"
            className={`nav-link ${isActive('/feed') ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Log My Build
          </Link>
          <Link
            to="/celebration"
            className={`nav-link ${isActive('/celebration') ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Community
          </Link>

          {user ? (
            <div className="nav-user">
              <span className="nav-username">@{user.username}</span>
              <Link
                to="/projects/new"
                className="btn-primary nav-cta"
                onClick={() => setMenuOpen(false)}
              >
                New Project
              </Link>
              <button className="btn-outline nav-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/register" className="btn-primary nav-cta" onClick={() => setMenuOpen(false)}>
              Join the Movement
            </Link>
          )}
        </div>

        <button
          className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
