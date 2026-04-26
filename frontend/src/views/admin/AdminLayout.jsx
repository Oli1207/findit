// AdminLayout.jsx — Squelette du panel admin avec sidebar
import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { logout } from '../../utils/auth';
import logo from '../../assets/findit_logoo.png';
import './admin.css';

const NAV = [
  {
    section: 'Vue d\'ensemble',
    items: [
      { to: '/superadmin',           icon: 'fas fa-chart-pie',       label: 'Dashboard',      exact: true },
    ],
  },
  {
    section: 'Gestion',
    items: [
      { to: '/superadmin/users',     icon: 'fas fa-users',           label: 'Utilisateurs' },
      { to: '/superadmin/vendors',   icon: 'fas fa-store',           label: 'Vendeurs' },
      { to: '/superadmin/orders',    icon: 'fas fa-receipt',         label: 'Commandes' },
    ],
  },
  {
    section: 'Finances',
    items: [
      { to: '/superadmin/payouts',   icon: 'fas fa-money-bill-wave', label: 'Reversements' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/superadmin/roles',     icon: 'fas fa-shield-alt',      label: 'Rôles & Admins' },
    ],
  },
];

export default function AdminLayout({ adminProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const userData = useAuthStore((s) => s.allUserData);

  const initials = (userData?.full_name || userData?.username || 'A')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="adm-root">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={`adm-sidebar${sidebarOpen ? ' adm-sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="adm-sidebar-brand">
          <img src={logo} alt="Findit" className="adm-sidebar-logo" />
          <span className="adm-sidebar-badge">ADMIN</span>
        </div>

        {/* Navigation */}
        <nav className="adm-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="adm-nav-section">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `adm-nav-item${isActive ? ' adm-nav-item--active' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="adm-sidebar-footer">
          <div className="adm-sidebar-user">
            <div className="adm-sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="adm-sidebar-uname">
                {userData?.full_name || userData?.username}
              </div>
              <div className="adm-sidebar-urole">
                {adminProfile?.is_superadmin ? 'Superadmin' : adminProfile?.role_name || 'Admin'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:14 }}
              title="Déconnexion"
            >
              <i className="fas fa-sign-out-alt" />
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="adm-main">
        {/* Topbar */}
        <div className="adm-topbar">
          <button
            className="adm-menu-btn adm-btn adm-btn--ghost adm-btn--sm"
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label="Menu"
          >
            <i className="fas fa-bars" />
          </button>
          <span className="adm-topbar-title">
            Findit <span style={{ color: '#DF468F' }}>Admin</span>
          </span>
          <div className="adm-topbar-search">
            <i className="fas fa-search" />
            <input placeholder="Recherche rapide…" />
          </div>
          <NavLink to="/" style={{ color: '#555', fontSize: 13, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-external-link-alt" /> App
          </NavLink>
        </div>

        {/* Content via Outlet */}
        <div className="adm-body">
          <Outlet context={{ adminProfile }} />
        </div>
      </main>
    </div>
  );
}
