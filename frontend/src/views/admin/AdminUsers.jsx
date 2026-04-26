// AdminUsers.jsx — Gestion des utilisateurs
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:3000, background:'#1a1a1a', color:'#fff' });

export default function AdminUsers() {
  const { adminProfile } = useOutletContext();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');

  const canBan = adminProfile?.is_superadmin || adminProfile?.permissions?.can_ban_users;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (filter) params.set('status', filter);
    apiInstance.get(`admin/users/?${params}`)
      .then(({ data }) => setUsers(data.results ?? data))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (user, action) => {
    const label = action === 'ban' ? 'bannir' : 'réactiver';
    const confirm = await Swal.fire({
      title: `${label.charAt(0).toUpperCase() + label.slice(1)} cet utilisateur ?`,
      text: user.email,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'ban' ? '#ef4444' : '#22c55e',
      confirmButtonText: label.charAt(0).toUpperCase() + label.slice(1),
      cancelButtonText: 'Annuler',
      background: '#1a1a1a', color: '#f0f0f0',
    });
    if (!confirm.isConfirmed) return;
    try {
      await apiInstance.post(`admin/users/${user.id}/action/`, { action });
      Toast.fire({ icon: 'success', title: `Utilisateur ${action === 'ban' ? 'banni' : 'réactivé'}.` });
      load();
    } catch (e) {
      Toast.fire({ icon: 'error', title: e.response?.data?.detail || 'Erreur.' });
    }
  };

  return (
    <>
      <div className="adm-section-header">
        <span className="adm-section-title">👥 Utilisateurs ({users.length})</span>
        <div className="adm-filters">
          <div className="adm-topbar-search" style={{ width: 200 }}>
            <i className="fas fa-search" />
            <input
              placeholder="Email, nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Bannis</option>
          </select>
          <button className="adm-btn adm-btn--ghost" onClick={load}>
            <i className="fas fa-sync-alt" />
          </button>
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-spinner" />
        ) : users.length === 0 ? (
          <div className="adm-empty">
            <i className="fas fa-users" />
            <p>Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Inscrit le</th>
                <th>Commandes</th>
                <th>Vendeur</th>
                <th>Statut</th>
                {canBan && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#e0e0e0' }}>{u.email}</td>
                  <td>{u.full_name || '—'}</td>
                  <td style={{ color: '#666' }}>{u.phone || '—'}</td>
                  <td style={{ color: '#666' }}>
                    {new Date(u.date_joined).toLocaleDateString('fr-FR')}
                  </td>
                  <td><span className="adm-badge adm-badge--blue">{u.order_count}</span></td>
                  <td>
                    {u.vendor_active === null ? (
                      <span className="adm-badge adm-badge--gray">—</span>
                    ) : u.vendor_active ? (
                      <span className="adm-badge adm-badge--green">Actif</span>
                    ) : (
                      <span className="adm-badge adm-badge--yellow">Inactif</span>
                    )}
                  </td>
                  <td>
                    {u.is_active
                      ? <span className="adm-badge adm-badge--green">Actif</span>
                      : <span className="adm-badge adm-badge--red">Banni</span>
                    }
                  </td>
                  {canBan && (
                    <td>
                      {u.is_active ? (
                        <button
                          className="adm-btn adm-btn--danger adm-btn--sm"
                          onClick={() => handleAction(u, 'ban')}
                        >
                          <i className="fas fa-ban" /> Bannir
                        </button>
                      ) : (
                        <button
                          className="adm-btn adm-btn--success adm-btn--sm"
                          onClick={() => handleAction(u, 'unban')}
                        >
                          <i className="fas fa-check" /> Réactiver
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
