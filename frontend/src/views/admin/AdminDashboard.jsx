// AdminDashboard.jsx — Vue d'ensemble : KPIs + revenus
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiInstance from '../../utils/axios';

function fmt(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}k`;
  return String(n);
}
function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(n || 0);
}

const ESCROW_LABELS = {
  pending_payment: { label: 'En attente paiement', cls: 'gray' },
  paid_holding:    { label: 'Fonds en séquestre',  cls: 'yellow' },
  shipped:         { label: 'Expédié',              cls: 'blue' },
  validated:       { label: 'Validé',               cls: 'green' },
  released:        { label: 'Reversé',              cls: 'green' },
  disputed:        { label: 'Litige',               cls: 'red' },
  refunded:        { label: 'Remboursé',            cls: 'red' },
};

export default function AdminDashboard() {
  const { adminProfile } = useOutletContext();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiInstance.get('admin/stats/')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="adm-spinner" />;
  if (!stats)  return <p style={{ color:'#555' }}>Impossible de charger les statistiques.</p>;

  const { users, vendors, products, orders, revenue } = stats;

  return (
    <>
      {/* ── Accueil ── */}
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>
          Bonjour 👋 {adminProfile?.user_name?.split(' ')[0]}
        </h2>
        <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          Voici un résumé de l'activité Findit aujourd'hui.
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Utilisateurs</span>
            <div className="adm-stat-icon adm-stat-icon--blue"><i className="fas fa-users" /></div>
          </div>
          <div className="adm-stat-value">{fmt(users.total)}</div>
          <div className="adm-stat-sub"><em>+{users.this_week}</em> cette semaine</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Vendeurs actifs</span>
            <div className="adm-stat-icon adm-stat-icon--pink"><i className="fas fa-store" /></div>
          </div>
          <div className="adm-stat-value">{fmt(vendors.active)}</div>
          <div className="adm-stat-sub">{vendors.inactive} en attente</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Produits</span>
            <div className="adm-stat-icon adm-stat-icon--green"><i className="fas fa-box-open" /></div>
          </div>
          <div className="adm-stat-value">{fmt(products.total)}</div>
          <div className="adm-stat-sub">{products.in_stock} en stock · {products.featured} mis en avant</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Commandes</span>
            <div className="adm-stat-icon adm-stat-icon--yellow"><i className="fas fa-receipt" /></div>
          </div>
          <div className="adm-stat-value">{fmt(orders.total)}</div>
          <div className="adm-stat-sub">
            <em>+{orders.this_month}</em> ce mois · {orders.in_escrow} en séquestre
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Revenus bruts</span>
            <div className="adm-stat-icon adm-stat-icon--green"><i className="fas fa-coins" /></div>
          </div>
          <div className="adm-stat-value" style={{ fontSize: 18 }}>{fmtMoney(revenue.total_gross)}</div>
          <div className="adm-stat-sub">Commandes payées seulement</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Commissions</span>
            <div className="adm-stat-icon adm-stat-icon--pink"><i className="fas fa-percent" /></div>
          </div>
          <div className="adm-stat-value" style={{ fontSize: 18 }}>{fmtMoney(revenue.platform_fees)}</div>
          <div className="adm-stat-sub">Frais plateforme collectés</div>
        </div>
      </div>

      {/* ── Revenue detail ── */}
      <div>
        <div className="adm-section-header" style={{ marginBottom: 12 }}>
          <span className="adm-section-title">💰 Finances en détail</span>
        </div>
        <div className="adm-revenue-cards">
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">Total reversé aux vendeurs</div>
            <div className="adm-revenue-value adm-revenue-value--green">{fmtMoney(revenue.vendor_payouts)}</div>
          </div>
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">En attente de reversement</div>
            <div className="adm-revenue-value adm-revenue-value--yellow">{fmtMoney(revenue.pending_release)}</div>
          </div>
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">Commissions Findit</div>
            <div className="adm-revenue-value adm-revenue-value--pink">{fmtMoney(revenue.platform_fees)}</div>
          </div>
          <div className="adm-revenue-card">
            <div className="adm-revenue-label">Volume total traité</div>
            <div className="adm-revenue-value">{fmtMoney(revenue.total_gross)}</div>
          </div>
        </div>
      </div>

      {/* ── Commandes en séquestre ── */}
      <div>
        <div className="adm-section-header" style={{ marginBottom: 12 }}>
          <span className="adm-section-title">🔒 Séquestre en temps réel</span>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(ESCROW_LABELS).map(([key, val]) => (
              <span key={key} className={`adm-badge adm-badge--${val.cls}`}>{val.label}</span>
            ))}
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Statut escrow</th>
                <th>Nb commandes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="adm-badge adm-badge--yellow">Fonds en séquestre</span></td>
                <td><strong>{orders.in_escrow}</strong></td>
              </tr>
              <tr>
                <td><span className="adm-badge adm-badge--gray">En attente paiement</span></td>
                <td><strong>{orders.pending}</strong></td>
              </tr>
              <tr>
                <td><span className="adm-badge adm-badge--green">Payées (total)</span></td>
                <td><strong>{orders.paid}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
