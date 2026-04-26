// AdminOrders.jsx — Toutes les commandes
import { useState, useEffect, useCallback } from 'react';
import apiInstance from '../../utils/axios';

const ESCROW_MAP = {
  pending_payment: { label:'En attente paiement', cls:'gray' },
  paid_holding:    { label:'Séquestre',           cls:'yellow' },
  shipped:         { label:'Expédié',             cls:'blue' },
  validated:       { label:'Validé client',       cls:'green' },
  released:        { label:'Reversé',             cls:'green' },
  disputed:        { label:'Litige',              cls:'red' },
  refunded:        { label:'Remboursé',           cls:'red' },
};
const PAYMENT_MAP = {
  en_attente: { label:'En attente', cls:'yellow' },
  complete:   { label:'Payé',       cls:'green' },
  annule:     { label:'Annulé',     cls:'red' },
};

function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(n || 0);
}

export default function AdminOrders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [escrow,  setEscrow]  = useState('');
  const [payment, setPayment] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)  params.set('q', search);
    if (escrow)  params.set('escrow', escrow);
    if (payment) params.set('payment', payment);
    apiInstance.get(`admin/orders/?${params}`)
      .then(({ data }) => setOrders(data.results ?? data))
      .finally(() => setLoading(false));
  }, [search, escrow, payment]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="adm-section-header">
        <span className="adm-section-title">🧾 Commandes ({orders.length})</span>
        <div className="adm-filters">
          <div className="adm-topbar-search" style={{ width: 200 }}>
            <i className="fas fa-search" />
            <input
              placeholder="OID, email, vendeur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select className="adm-select" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">Paiement (tous)</option>
            <option value="en_attente">En attente</option>
            <option value="complete">Payé</option>
            <option value="annule">Annulé</option>
          </select>
          <select className="adm-select" value={escrow} onChange={(e) => setEscrow(e.target.value)}>
            <option value="">Séquestre (tous)</option>
            {Object.entries(ESCROW_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button className="adm-btn adm-btn--ghost" onClick={load}><i className="fas fa-sync-alt" /></button>
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? <div className="adm-spinner" /> : orders.length === 0 ? (
          <div className="adm-empty"><i className="fas fa-receipt" /><p>Aucune commande.</p></div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>OID</th>
                <th>Acheteur</th>
                <th>Vendeur</th>
                <th>Produit</th>
                <th>Montant</th>
                <th>Plateforme</th>
                <th>Paiement</th>
                <th>Séquestre</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const esc = ESCROW_MAP[o.escrow_status] || { label: o.escrow_status, cls:'gray' };
                const pay = PAYMENT_MAP[o.payment_status] || { label: o.payment_status, cls:'gray' };
                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'#888' }}>{o.oid}</td>
                    <td style={{ fontSize:12 }}>{o.buyer_email || '—'}</td>
                    <td style={{ fontWeight:600 }}>{o.vendor_name || '—'}</td>
                    <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>
                      {o.product_title || '—'}
                    </td>
                    <td style={{ fontWeight:700, color:'#f0f0f0' }}>{fmtMoney(o.price)}</td>
                    <td style={{ color:'#DF468F', fontSize:12 }}>{fmtMoney(o.platform_fee)}</td>
                    <td><span className={`adm-badge adm-badge--${pay.cls}`}>{pay.label}</span></td>
                    <td><span className={`adm-badge adm-badge--${esc.cls}`}>{esc.label}</span></td>
                    <td style={{ color:'#555', fontSize:11, whiteSpace:'nowrap' }}>
                      {new Date(o.date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
