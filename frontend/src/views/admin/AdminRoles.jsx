// AdminRoles.jsx — Gestion des rôles + admins
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:3000, background:'#1a1a1a', color:'#fff' });

const PERM_GROUPS = [
  {
    label: 'Utilisateurs',
    perms: ['can_view_users','can_edit_users','can_ban_users','can_delete_users'],
  },
  {
    label: 'Vendeurs',
    perms: ['can_view_vendors','can_approve_vendors','can_suspend_vendors'],
  },
  {
    label: 'Produits',
    perms: ['can_view_products','can_edit_products','can_delete_products','can_feature_products'],
  },
  {
    label: 'Commandes',
    perms: ['can_view_orders','can_manage_orders'],
  },
  {
    label: 'Finances',
    perms: ['can_view_payments','can_process_payouts','can_view_stats'],
  },
  {
    label: 'Contenu',
    perms: ['can_manage_categories','can_manage_presentations'],
  },
  {
    label: 'Administration',
    perms: ['can_manage_roles','can_manage_admins'],
  },
];

const PERM_LABEL = {
  can_view_users:       'Voir utilisateurs',
  can_edit_users:       'Modifier utilisateurs',
  can_ban_users:        'Bannir utilisateurs',
  can_delete_users:     'Supprimer utilisateurs',
  can_view_vendors:     'Voir vendeurs',
  can_approve_vendors:  'Approuver vendeurs',
  can_suspend_vendors:  'Suspendre vendeurs',
  can_view_products:    'Voir produits',
  can_edit_products:    'Modifier produits',
  can_delete_products:  'Supprimer produits',
  can_feature_products: 'Mettre en avant',
  can_view_orders:      'Voir commandes',
  can_manage_orders:    'Gérer commandes',
  can_view_payments:    'Voir finances',
  can_process_payouts:  'Traiter reversements',
  can_view_stats:       'Voir statistiques',
  can_manage_categories:'Gérer catégories',
  can_manage_presentations:'Gérer présentations',
  can_manage_roles:     'Gérer rôles',
  can_manage_admins:    'Gérer admins',
};

const EMPTY_ROLE = () => ({
  name: '', description: '',
  ...Object.fromEntries(Object.keys(PERM_LABEL).map(k => [k, false])),
});

export default function AdminRoles() {
  const { adminProfile } = useOutletContext();
  const [roles,    setRoles]    = useState([]);
  const [admins,   setAdmins]   = useState([]);
  const [tab,      setTab]      = useState('roles');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'role' | 'admin'
  const [editRole, setEditRole] = useState(EMPTY_ROLE());
  const [editId,   setEditId]   = useState(null);
  const [newAdmin, setNewAdmin] = useState({ email:'', role_id:'', notes:'' });
  const [saving,   setSaving]   = useState(false);

  const canManageRoles  = adminProfile?.is_superadmin || adminProfile?.permissions?.can_manage_roles;
  const canManageAdmins = adminProfile?.is_superadmin || adminProfile?.permissions?.can_manage_admins;

  const loadRoles = () => {
    apiInstance.get('admin/roles/').then(({ data }) => setRoles(data)).finally(() => setLoading(false));
  };
  const loadAdmins = () => {
    apiInstance.get('admin/profiles/').then(({ data }) => setAdmins(data)).catch(() => {});
  };

  useEffect(() => { loadRoles(); loadAdmins(); }, []);

  // ── Sauvegarder un rôle ──
  const saveRole = async () => {
    setSaving(true);
    try {
      if (editId) {
        await apiInstance.put(`admin/roles/${editId}/`, editRole);
        Toast.fire({ icon:'success', title:'Rôle mis à jour.' });
      } else {
        await apiInstance.post('admin/roles/', editRole);
        Toast.fire({ icon:'success', title:'Rôle créé.' });
      }
      setModal(null);
      setEditRole(EMPTY_ROLE());
      setEditId(null);
      loadRoles();
    } catch (e) {
      Toast.fire({ icon:'error', title: Object.values(e.response?.data || {}).flat()[0] || 'Erreur.' });
    } finally { setSaving(false); }
  };

  const deleteRole = async (role) => {
    const confirm = await Swal.fire({
      title: `Supprimer le rôle "${role.name}" ?`, icon:'warning',
      showCancelButton:true, confirmButtonColor:'#ef4444',
      confirmButtonText:'Supprimer', cancelButtonText:'Annuler',
      background:'#1a1a1a', color:'#f0f0f0',
    });
    if (!confirm.isConfirmed) return;
    await apiInstance.delete(`admin/roles/${role.id}/`);
    Toast.fire({ icon:'success', title:'Rôle supprimé.' });
    loadRoles();
  };

  // ── Promouvoir un admin ──
  const saveAdmin = async () => {
    setSaving(true);
    try {
      await apiInstance.post('admin/profiles/', newAdmin);
      Toast.fire({ icon:'success', title:'Admin créé / mis à jour.' });
      setModal(null);
      setNewAdmin({ email:'', role_id:'', notes:'' });
      loadAdmins();
    } catch (e) {
      Toast.fire({ icon:'error', title: e.response?.data?.detail || 'Erreur.' });
    } finally { setSaving(false); }
  };

  const toggleAdminActive = async (profile) => {
    try {
      await apiInstance.patch(`admin/profiles/${profile.id}/`, { is_active: !profile.is_active });
      Toast.fire({ icon:'success', title: profile.is_active ? 'Admin désactivé.' : 'Admin activé.' });
      loadAdmins();
    } catch (e) {
      Toast.fire({ icon:'error', title: 'Erreur.' });
    }
  };

  if (!canManageRoles && !canManageAdmins) {
    return (
      <div className="adm-denied">
        <i className="fas fa-shield-alt" />
        <h3>Accès refusé</h3>
        <p>Vous n'avez pas les droits pour gérer les rôles ou les admins.</p>
      </div>
    );
  }

  return (
    <>
      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:4 }}>
        {['roles','admins'].map((t) => (
          <button
            key={t}
            className={`adm-btn ${tab === t ? 'adm-btn--primary' : 'adm-btn--ghost'}`}
            onClick={() => setTab(t)}
          >
            <i className={`fas fa-${t === 'roles' ? 'shield-alt' : 'user-shield'}`} />
            {t === 'roles' ? 'Rôles' : 'Admins'}
          </button>
        ))}
      </div>

      {/* ══ ROLES ══ */}
      {tab === 'roles' && (
        <>
          <div className="adm-section-header">
            <span className="adm-section-title">🛡️ Rôles ({roles.length})</span>
            {canManageRoles && (
              <button className="adm-btn adm-btn--primary" onClick={() => { setEditRole(EMPTY_ROLE()); setEditId(null); setModal('role'); }}>
                <i className="fas fa-plus" /> Nouveau rôle
              </button>
            )}
          </div>

          <div className="adm-table-wrap">
            {loading ? <div className="adm-spinner" /> : roles.length === 0 ? (
              <div className="adm-empty"><i className="fas fa-shield-alt" /><p>Aucun rôle.</p></div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Nom</th><th>Description</th><th>Permissions actives</th>{canManageRoles && <th>Actions</th>}</tr>
                </thead>
                <tbody>
                  {roles.map((r) => {
                    const activeCount = Object.keys(PERM_LABEL).filter(k => r[k]).length;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight:700, color:'#f0f0f0' }}>{r.name}</td>
                        <td style={{ color:'#666', fontSize:12 }}>{r.description || '—'}</td>
                        <td>
                          <span className="adm-badge adm-badge--pink">{activeCount} / {Object.keys(PERM_LABEL).length}</span>
                        </td>
                        {canManageRoles && (
                          <td style={{ display:'flex', gap:6 }}>
                            <button className="adm-btn adm-btn--ghost adm-btn--sm"
                              onClick={() => { setEditRole({ ...r }); setEditId(r.id); setModal('role'); }}>
                              <i className="fas fa-edit" /> Modifier
                            </button>
                            <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => deleteRole(r)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══ ADMINS ══ */}
      {tab === 'admins' && (
        <>
          <div className="adm-section-header">
            <span className="adm-section-title">👮 Admins ({admins.length})</span>
            {canManageAdmins && (
              <button className="adm-btn adm-btn--primary" onClick={() => setModal('admin')}>
                <i className="fas fa-user-plus" /> Promouvoir un admin
              </button>
            )}
          </div>
          <div className="adm-table-wrap">
            {admins.length === 0 ? (
              <div className="adm-empty"><i className="fas fa-user-shield" /><p>Aucun admin.</p></div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Superadmin</th><th>Actif</th>{canManageAdmins && <th>Actions</th>}</tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight:600 }}>{a.user_email}</td>
                      <td>{a.user_name || '—'}</td>
                      <td>
                        {a.is_superadmin
                          ? <span className="adm-badge adm-badge--pink">Superadmin</span>
                          : <span className="adm-badge adm-badge--blue">{a.role_name || '—'}</span>
                        }
                      </td>
                      <td>{a.is_superadmin ? '✅' : '—'}</td>
                      <td>
                        {a.is_active
                          ? <span className="adm-badge adm-badge--green">Actif</span>
                          : <span className="adm-badge adm-badge--red">Désactivé</span>
                        }
                      </td>
                      {canManageAdmins && !a.is_superadmin && (
                        <td>
                          <button
                            className={`adm-btn adm-btn--sm ${a.is_active ? 'adm-btn--danger' : 'adm-btn--success'}`}
                            onClick={() => toggleAdminActive(a)}
                          >
                            {a.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                        </td>
                      )}
                      {canManageAdmins && a.is_superadmin && <td>—</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══ MODAL RÔLE ══ */}
      {modal === 'role' && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="adm-modal" style={{ maxWidth: 640 }}>
            <div className="adm-modal-header">
              <span className="adm-modal-title">{editId ? 'Modifier le rôle' : 'Nouveau rôle'}</span>
              <button className="adm-modal-close" onClick={() => setModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Nom du rôle</label>
                <input className="adm-input" placeholder="Ex: Modérateur" value={editRole.name}
                  onChange={(e) => setEditRole({ ...editRole, name: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Description</label>
                <textarea className="adm-input" placeholder="Rôle dédié à…" value={editRole.description}
                  onChange={(e) => setEditRole({ ...editRole, description: e.target.value })} />
              </div>

              {PERM_GROUPS.map((g) => (
                <div key={g.label}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', marginBottom:6, marginTop:4 }}>
                    {g.label}
                  </div>
                  <div className="adm-perms-grid">
                    {g.perms.map((perm) => (
                      <div className="adm-perm-row" key={perm}>
                        <span className="adm-perm-name">{PERM_LABEL[perm]}</span>
                        <label className="adm-toggle">
                          <input type="checkbox" checked={!!editRole[perm]}
                            onChange={(e) => setEditRole({ ...editRole, [perm]: e.target.checked })} />
                          <span className="adm-toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className="adm-btn adm-btn--primary" onClick={saveRole} disabled={saving || !editRole.name}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Sauvegarde…</> : <><i className="fas fa-save" /> Sauvegarder</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ADMIN ══ */}
      {modal === 'admin' && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-header">
              <span className="adm-modal-title">Promouvoir un administrateur</span>
              <button className="adm-modal-close" onClick={() => setModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Email de l'utilisateur</label>
                <input className="adm-input" type="email" placeholder="user@exemple.com"
                  value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Rôle</label>
                <select className="adm-select" value={newAdmin.role_id}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role_id: e.target.value })}>
                  <option value="">— Choisir un rôle —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label>Notes internes</label>
                <textarea className="adm-input" placeholder="Responsable de…"
                  value={newAdmin.notes} onChange={(e) => setNewAdmin({ ...newAdmin, notes: e.target.value })} />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className="adm-btn adm-btn--primary" onClick={saveAdmin} disabled={saving || !newAdmin.email}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> …</> : <><i className="fas fa-user-plus" /> Promouvoir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
