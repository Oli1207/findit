// AdminVendors.jsx — Gestion des vendeurs
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:3000, background:'#1a1a1a', color:'#fff' });

function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(n || 0);
}

const STATUS_BADGE = {
  pending:  { label:'En attente', color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
  approved: { label:'Approuvé',   color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
  rejected: { label:'Rejeté',     color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
};

// ── Tab : liste vendeurs ───────────────────────────────────────────────────────
function VendorList({ adminProfile }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');

  const canApprove = adminProfile?.is_superadmin || adminProfile?.permissions?.can_approve_vendors;
  const canSuspend = adminProfile?.is_superadmin || adminProfile?.permissions?.can_approve_vendors;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (filter) params.set('active', filter);
    apiInstance.get(`admin/vendors/?${params}`)
      .then(({ data }) => setVendors(data.results ?? data))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (vendor, action, extra = {}) => {
    const LABELS = {
      suspend:              `Suspendre ${vendor.name} ?`,
      reactivate:           `Réactiver ${vendor.name} ?`,
      verify:               `Accorder le badge bleu ✓ à ${vendor.name} ?`,
      reject_verification:  `Rejeter la vérification de ${vendor.name} ?`,
    };
    const { isConfirmed } = await Swal.fire({
      title: LABELS[action] || action,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: ['suspend', 'reject_verification'].includes(action) ? '#ef4444' : '#22c55e',
      confirmButtonText: 'Confirmer',
      cancelButtonText:  'Annuler',
      background: '#1a1a1a', color: '#f0f0f0',
    });
    if (!isConfirmed) return;
    try {
      await apiInstance.post(`admin/vendors/${vendor.id}/action/`, { action, ...extra });
      Toast.fire({ icon: 'success', title: 'Action effectuée.' });
      load();
    } catch (e) {
      Toast.fire({ icon: 'error', title: e.response?.data?.detail || 'Erreur.' });
    }
  };

  return (
    <div className="adm-table-wrap">
      {/* Filtres */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div className="adm-topbar-search" style={{ flex:1, minWidth:180 }}>
          <i className="fas fa-search" />
          <input placeholder="Boutique, email…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Suspendus</option>
        </select>
        <button className="adm-btn adm-btn--ghost" onClick={load}><i className="fas fa-sync-alt" /></button>
      </div>

      {loading ? <div className="adm-spinner" style={{ margin:'40px auto' }} /> :
       vendors.length === 0 ? (
        <div className="adm-empty"><i className="fas fa-store" /><p>Aucun vendeur.</p></div>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Boutique</th>
              <th>Contact</th>
              <th>Produits</th>
              <th>Commandes</th>
              <th>Revenus</th>
              <th>Statut</th>
              <th>Identité</th>
              {(canApprove || canSuspend) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                {/* Boutique */}
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:700, color:'#f0f0f0' }}>{v.name || '—'}</span>
                    {v.verified && (
                      <span title="Identité vérifiée" style={{ color:'#3b82f6', fontSize:14 }}>
                        <i className="fas fa-badge-check" />
                        {/* fallback si l'icône n'existe pas */}
                        ✓
                      </span>
                    )}
                  </div>
                </td>
                {/* Contact */}
                <td>
                  <div style={{ fontSize:12, lineHeight:1.6 }}>
                    <span style={{ color:'#888' }}>{v.user_email}</span>
                    {v.mobile && (
                      <span style={{ display:'block', color:'#0ba4db' }}>
                        <i className="fas fa-phone" style={{ marginRight:4 }} />{v.mobile}
                      </span>
                    )}
                  </div>
                </td>
                {/* Chiffres */}
                <td><span className="adm-badge adm-badge--blue">{v.product_count}</span></td>
                <td><span className="adm-badge adm-badge--pink">{v.order_count}</span></td>
                <td style={{ fontWeight:600, color:'#22c55e', fontSize:13 }}>{fmtMoney(v.revenue)}</td>
                {/* Statut suspension */}
                <td>
                  {v.active
                    ? <span className="adm-badge adm-badge--green">Actif</span>
                    : <span className="adm-badge adm-badge--yellow">Suspendu</span>
                  }
                </td>
                {/* Statut identité */}
                <td>
                  {v.verified ? (
                    <span className="adm-badge" style={{ background:'rgba(59,130,246,0.15)', color:'#3b82f6' }}>
                      <i className="fas fa-check-circle" style={{ marginRight:4 }} />Vérifié
                    </span>
                  ) : v.verification_status ? (
                    <span className="adm-badge" style={{
                      background: STATUS_BADGE[v.verification_status]?.bg,
                      color:      STATUS_BADGE[v.verification_status]?.color,
                    }}>
                      {STATUS_BADGE[v.verification_status]?.label}
                    </span>
                  ) : (
                    <span className="adm-badge" style={{ background:'rgba(255,255,255,0.05)', color:'#555' }}>—</span>
                  )}
                </td>
                {/* Actions */}
                {(canApprove || canSuspend) && (
                  <td>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {v.active ? (
                        <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => handleAction(v, 'suspend')}>
                          <i className="fas fa-ban" /> Suspendre
                        </button>
                      ) : (
                        <button className="adm-btn adm-btn--success adm-btn--sm" onClick={() => handleAction(v, 'reactivate')}>
                          <i className="fas fa-check" /> Réactiver
                        </button>
                      )}
                      {/* Badge identité */}
                      {!v.verified && v.verification_status === 'pending' && (
                        <>
                          <button className="adm-btn adm-btn--sm" style={{ background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)' }}
                            onClick={() => handleAction(v, 'verify')}>
                            <i className="fas fa-id-card" /> Vérifier
                          </button>
                          <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => handleAction(v, 'reject_verification')}>
                            <i className="fas fa-times" /> Rejeter
                          </button>
                        </>
                      )}
                      {v.verified && (
                        <button className="adm-btn adm-btn--sm" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', fontSize:11 }}
                          onClick={() => handleAction(v, 'reject_verification')}>
                          <i className="fas fa-times" /> Retirer badge
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Tab : vérifications d'identité en attente ─────────────────────────────────
function PendingVerifications({ adminProfile }) {
  const [verifs,  setVerifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState(null); // photo viewer

  const canApprove = adminProfile?.is_superadmin || adminProfile?.permissions?.can_approve_vendors;

  const load = () => {
    setLoading(true);
    apiInstance.get('admin/verifications/?status=pending')
      .then(({ data }) => setVerifs(data.verifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDecision = async (verif, action) => {
    const { isConfirmed, value } = await Swal.fire({
      title: action === 'verify' ? `Approuver ${verif.vendor_name} ?` : `Rejeter ${verif.vendor_name} ?`,
      input: action === 'reject_verification' ? 'text' : undefined,
      inputLabel: action === 'reject_verification' ? 'Raison du rejet (optionnel)' : undefined,
      inputPlaceholder: 'Photos floues, document illisible…',
      icon: action === 'verify' ? 'success' : 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'verify' ? '#3b82f6' : '#ef4444',
      confirmButtonText: action === 'verify' ? '✓ Accorder le badge bleu' : '✗ Rejeter',
      cancelButtonText: 'Annuler',
      background: '#1a1a1a', color: '#f0f0f0',
    });
    if (!isConfirmed) return;
    try {
      await apiInstance.post(`admin/vendors/${verif.vendor_id}/action/`, { action, notes: value || '' });
      Toast.fire({ icon: 'success', title: action === 'verify' ? 'Badge accordé ✓' : 'Rejeté.' });
      load();
    } catch (e) {
      Toast.fire({ icon: 'error', title: e.response?.data?.detail || 'Erreur.' });
    }
  };

  if (loading) return <div className="adm-spinner" style={{ margin:'40px auto' }} />;
  if (verifs.length === 0) return (
    <div className="adm-empty">
      <i className="fas fa-id-card" style={{ color:'#22c55e' }} />
      <p>Aucune demande en attente. Tout est traité ✅</p>
    </div>
  );

  return (
    <div>
      {/* Visionneuse photo */}
      {view && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setView(null)}>
          <img src={view} alt="photo" style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:12, boxShadow:'0 0 60px rgba(0,0,0,0.8)' }} />
          <button onClick={() => setView(null)} style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:40, height:40, borderRadius:'50%', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {verifs.map((v) => (
          <div key={v.id} style={{ background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 22px' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <span style={{ fontWeight:700, color:'#f0f0f0', fontSize:15 }}>{v.vendor_name}</span>
                <span style={{ marginLeft:10, color:'#888', fontSize:12 }}>{v.vendor_email}</span>
                {v.vendor_mobile && (
                  <a href={`tel:${v.vendor_mobile}`} style={{ marginLeft:10, color:'#0ba4db', fontSize:12, textDecoration:'none' }}>
                    <i className="fas fa-phone" style={{ marginRight:4 }} />{v.vendor_mobile}
                  </a>
                )}
              </div>
              <span style={{ fontSize:11, color:'#555' }}>Soumis le {new Date(v.submitted_at).toLocaleDateString('fr-FR')}</span>
            </div>

            {/* Photos */}
            <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
              {[['id_front', 'Recto CNI', v.id_front], ['id_back', 'Verso CNI', v.id_back], ['selfie', 'Selfie + CNI', v.selfie]].map(([key, label, url]) => (
                <div key={key} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
                  {url ? (
                    <img src={url} alt={label} onClick={() => setView(url)}
                      style={{ width:110, height:80, objectFit:'cover', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', cursor:'zoom-in' }} />
                  ) : (
                    <div style={{ width:110, height:80, background:'rgba(255,255,255,0.04)', borderRadius:8, border:'1px dashed rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:11 }}>
                      Absent
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Boutons */}
            {canApprove && (
              <div style={{ display:'flex', gap:10 }}>
                <button className="adm-btn adm-btn--sm" style={{ background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)', flex:1 }}
                  onClick={() => handleDecision(v, 'verify')}>
                  <i className="fas fa-check" style={{ marginRight:6 }} />Accorder le badge bleu
                </button>
                <button className="adm-btn adm-btn--danger adm-btn--sm" style={{ flex:1 }}
                  onClick={() => handleDecision(v, 'reject_verification')}>
                  <i className="fas fa-times" style={{ marginRight:6 }} />Rejeter
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AdminVendors() {
  const { adminProfile } = useOutletContext();
  const [tab, setTab] = useState('list');
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    apiInstance.get('admin/verifications/?status=pending')
      .then(({ data }) => setPendingCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="adm-section-header">
        <span className="adm-section-title">🏪 Vendeurs</span>

        <div style={{ display:'flex', gap:8 }}>
          <button
            className={`adm-btn adm-btn--sm${tab === 'list' ? '' : ' adm-btn--ghost'}`}
            onClick={() => setTab('list')}
          >
            <i className="fas fa-list" /> Liste
          </button>
          <button
            className={`adm-btn adm-btn--sm${tab === 'verif' ? '' : ' adm-btn--ghost'}`}
            onClick={() => setTab('verif')}
            style={{ position:'relative' }}
          >
            <i className="fas fa-id-card" /> Vérifications
            {pendingCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === 'list'  && <VendorList adminProfile={adminProfile} />}
      {tab === 'verif' && <PendingVerifications adminProfile={adminProfile} />}
    </>
  );
}
