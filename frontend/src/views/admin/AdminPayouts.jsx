// AdminPayouts.jsx — Reversements aux vendeurs
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:3500, background:'#1a1a1a', color:'#fff' });

function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(n || 0);
}

export default function AdminPayouts() {
  const { adminProfile }  = useOutletContext();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(null);

  const canProcess = adminProfile?.is_superadmin || adminProfile?.permissions?.can_process_payouts;
  const canView    = adminProfile?.is_superadmin || adminProfile?.permissions?.can_view_payments;

  const load = () => {
    setLoading(true);
    apiInstance.get('admin/payouts/')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (!canView) {
    return (
      <div className="adm-denied">
        <i className="fas fa-lock" />
        <h3>Accès restreint</h3>
        <p>Vous n'avez pas la permission de voir les finances.</p>
      </div>
    );
  }

  const handleRelease = async (payout) => {
    const contact = [payout.vendor_mobile, payout.vendor_email].filter(Boolean).join(' · ');
    const confirm = await Swal.fire({
      title: `Reverser ${fmtMoney(payout.vendor_amount)} à ${payout.vendor_name} ?`,
      html: `
        <div style="text-align:left;font-size:13px;color:#aaa;margin-top:8px">
          <p>📦 Commande : <strong style="color:#fff">${payout.order_oid}</strong></p>
          <p>🛍️ Produit : <strong style="color:#fff">${payout.product}</strong></p>
          ${contact ? `<p>📞 Contact : <strong style="color:#0ba4db">${contact}</strong></p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Confirmer le reversement',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#22c55e',
      background: '#1a1a1a', color: '#f0f0f0',
    });
    if (!confirm.isConfirmed) return;

    setPaying(payout.order_oid);
    try {
      await apiInstance.post('admin/payouts/', { order_oid: payout.order_oid });
      Toast.fire({ icon:'success', title:`Reversement de ${fmtMoney(payout.vendor_amount)} confirmé.` });
      load();
    } catch (e) {
      Toast.fire({ icon:'error', title: e.response?.data?.detail || 'Erreur.' });
    } finally {
      setPaying(null);
    }
  };

  return (
    <>
      <div className="adm-section-header">
        <span className="adm-section-title">💸 Reversements en attente</span>
        <button className="adm-btn adm-btn--ghost" onClick={load}>
          <i className="fas fa-sync-alt" /> Actualiser
        </button>
      </div>

      {/* Total */}
      {data && (
        <div className="adm-revenue-cards">
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">Total à reverser</div>
            <div className="adm-revenue-value adm-revenue-value--yellow">
              {fmtMoney(data.total_pending)}
            </div>
          </div>
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">Nb de reversements</div>
            <div className="adm-revenue-value">{data.payouts?.length ?? 0}</div>
          </div>
        </div>
      )}

      <div className="adm-table-wrap">
        {loading ? <div className="adm-spinner" /> :
         !data || data.payouts?.length === 0 ? (
          <div className="adm-empty">
            <i className="fas fa-check-circle" style={{ color:'#22c55e' }} />
            <p>Aucun reversement en attente. Tout est à jour ✅</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>OID</th>
                <th>Vendeur</th>
                <th>Contact</th>
                <th>Produit</th>
                <th>Montant vendeur</th>
                <th>Frais plateforme</th>
                <th>Date</th>
                {canProcess && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {data.payouts.map((p) => (
                <tr key={p.order_oid}>
                  <td style={{ fontFamily:'monospace', fontSize:12, color:'#888' }}>{p.order_oid}</td>
                  <td style={{ fontWeight:700 }}>{p.vendor_name}</td>
                  <td>
                    <div style={{ fontSize:12, lineHeight:1.5 }}>
                      {p.vendor_mobile && (
                        <a href={`tel:${p.vendor_mobile}`} style={{ color:'#0ba4db', display:'block', textDecoration:'none' }}>
                          <i className="fas fa-phone" style={{ marginRight:4 }} />{p.vendor_mobile}
                        </a>
                      )}
                      {p.vendor_email && (
                        <a href={`mailto:${p.vendor_email}`} style={{ color:'#888', display:'block', textDecoration:'none', fontSize:11 }}>
                          {p.vendor_email}
                        </a>
                      )}
                      {!p.vendor_mobile && !p.vendor_email && <span style={{ color:'#444' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, color:'#888' }}>
                    {p.product}
                  </td>
                  <td style={{ fontWeight:700, color:'#22c55e', fontSize:15 }}>{fmtMoney(p.vendor_amount)}</td>
                  <td style={{ color:'#DF468F' }}>{fmtMoney(p.platform_fee)}</td>
                  <td style={{ color:'#555', fontSize:11 }}>
                    {new Date(p.date).toLocaleDateString('fr-FR')}
                  </td>
                  {canProcess && (
                    <td>
                      <button
                        className="adm-btn adm-btn--success adm-btn--sm"
                        onClick={() => handleRelease(p)}
                        disabled={paying === p.order_oid}
                      >
                        {paying === p.order_oid
                          ? <><i className="fas fa-spinner fa-spin" /> …</>
                          : <><i className="fas fa-paper-plane" /> Reverser</>
                        }
                      </button>
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
