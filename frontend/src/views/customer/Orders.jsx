// Orders.jsx — Mes commandes (Customer)
// Bannière image full-width + tabs + escrow validation + oc- prefix
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import { useEscrowOrder } from '../../hooks/useEscrowOrder';
import './orderscustomer.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtPrice(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR');
}
function statusLabel(s) {
  const map = {
    pending:      'En attente',
    paid_holding: 'Payé',
    shipped:      'Expédié',
    delivered:    'Livré',
    completed:    'Terminé',
    validated:    'Validé',
    released:     'Finalisé',
    cancelled:    'Annulé',
  };
  return map[(s || '').toLowerCase()] || s || '—';
}
function pillCls(s) {
  const k = (s || '').toLowerCase();
  if (['delivered', 'completed', 'validated', 'released'].includes(k)) return 'success';
  if (k === 'shipped')   return 'info';
  if (k === 'cancelled') return 'danger';
  return 'warning';
}

const TABS = [
  { key: 'all',       label: 'Tout' },
  { key: 'pending',   label: 'En attente' },
  { key: 'shipped',   label: 'Expédié' },
  { key: 'delivered', label: 'Livré' },
];
function matchesTab(o, tab) {
  if (tab === 'all') return true;
  const s = (o.escrow_status || o.order_status || '').toLowerCase();
  if (tab === 'pending')   return ['pending', 'paid_holding'].includes(s);
  if (tab === 'shipped')   return s === 'shipped';
  if (tab === 'delivered') return ['delivered', 'completed', 'validated', 'released'].includes(s);
  return true;
}

function SkeletonCard() {
  return <div className="oc-skel oc-skel--card" />;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Orders() {
  const userData = UserData();
  const navigate = useNavigate();

  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState('all');
  const [validationInputs, setValidationInputs] = useState({});
  const [validatingOid,    setValidatingOid]    = useState(null);

  const { handleValidateDelivery } = useEscrowOrder({
    userData,
    qtyValue: 1,
    sizeValue: 'No Size',
    colorValue: 'No Color',
    profileData: null,
    useProfileAddress: false,
    customAddress: {},
  });

  const fetchOrders = useCallback(async () => {
    if (!userData?.user_id) return;
    try {
      const res = await apiInstance.get(`customer/orders/${userData.user_id}`);
      setOrders(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userData?.user_id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => matchesTab(o, activeTab));
  const counts   = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? 0 : orders.filter(o => matchesTab(o, t.key)).length;
    return acc;
  }, {});

  return (
    <div className="oc-page">

      {/* Top bar */}
      <div className="oc-topbar">
        <button className="oc-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <span className="oc-topbar-title">Mes commandes</span>
        <div className="oc-topbar-actions">
          <button className="oc-topbar-icon-btn" onClick={() => navigate('/customer/messages/')} aria-label="Messages">
            <i className="fas fa-comment-alt" />
          </button>
          <button className="oc-topbar-icon-btn" onClick={() => navigate('/customer/wishlist/')} aria-label="Favoris">
            <i className="fas fa-heart" />
          </button>
          <button className="oc-topbar-icon-btn" onClick={() => navigate('/customer/account/')} aria-label="Paramètres">
            <i className="fas fa-cog" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="oc-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`oc-tab${activeTab === t.key ? ' oc-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && (
              <span className="oc-tab-badge">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="oc-feed">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="oc-empty">
            <i className="fas fa-box-open" />
            <p className="oc-empty-title">
              {activeTab === 'all' ? 'Aucune commande' : `Aucune commande "${TABS.find(t => t.key === activeTab)?.label}"`}
            </p>
            {activeTab === 'all' && (
              <p className="oc-empty-sub">Vos achats apparaîtront ici dès que vous passez une commande.</p>
            )}
          </div>
        ) : (
          filtered.map(o => {
            const escrow = (o.escrow_status || '').toLowerCase();
            const status = escrow || (o.order_status || '').toLowerCase();

            return (
              <div key={o.oid || o.id} className="oc-card">

                {/* ── Bannière image full-width ── */}
                <div className="oc-banner">
                  {o.product?.image
                    ? <img src={o.product.image} alt={o.product?.title} />
                    : <div className="oc-banner-placeholder"><i className="fas fa-image" /></div>
                  }
                  <span className={`oc-status-pill oc-status-pill--${pillCls(status)}`}>
                    {statusLabel(status)}
                  </span>
                </div>

                {/* ── Corps ── */}
                <div className="oc-card-body">
                  <div className="oc-card-meta-row">
                    <span className="oc-card-oid">#{o.oid}</span>
                    <span className="oc-card-date">
                      <i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />{fmtDate(o.date)}
                    </span>
                  </div>
                  <p className="oc-card-title">{o.product?.title || 'Produit'}</p>
                  {o.vendor?.name && (
                    <span className="oc-card-vendor"><i className="fas fa-store" /> {o.vendor.name}</span>
                  )}
                </div>

                {/* ── Meta chips ── */}
                <div className="oc-card-meta">
                  {o.qty > 0 && (
                    <span className="oc-chip"><i className="fas fa-layer-group" />{o.qty} art.</span>
                  )}
                  {o.size  && o.size  !== 'No Size'  && <span className="oc-chip"><i className="fas fa-ruler" />{o.size}</span>}
                  {o.color && o.color !== 'No Color' && <span className="oc-chip"><i className="fas fa-palette" />{o.color}</span>}
                  {o.city  && <span className="oc-chip"><i className="fas fa-map-marker-alt" />{o.city}</span>}
                </div>

                {/* ── Escrow banners ── */}
                {escrow === 'paid_holding' && (
                  <div className="oc-escrow-banner oc-escrow-banner--holding">
                    <i className="fas fa-lock" />
                    Paiement sécurisé — le vendeur prépare votre commande.
                  </div>
                )}
                {escrow === 'shipped' && (
                  <div className="oc-escrow-banner oc-escrow-banner--shipped">
                    <i className="fas fa-truck" />
                    Commande expédiée ! Validez à réception ci-dessous.
                  </div>
                )}
                {escrow === 'validated' && (
                  <div className="oc-escrow-banner oc-escrow-banner--done">
                    <i className="fas fa-check-circle" />
                    Réception confirmée — paiement en cours de reversement.
                  </div>
                )}
                {escrow === 'released' && (
                  <div className="oc-escrow-banner oc-escrow-banner--done">
                    <i className="fas fa-check-double" />
                    Commande finalisée. Merci pour votre achat !
                  </div>
                )}

                {/* ── Validation code (expédié uniquement) ── */}
                {escrow === 'shipped' && (
                  <div className="oc-validation-block">
                    <p className="oc-validation-hint">
                      Entrez votre <strong>code de validation</strong> reçu par e-mail pour confirmer la réception.
                    </p>
                    <div className="oc-validation-row">
                      <input
                        className="oc-code-input"
                        type="text"
                        placeholder="A3F7D2"
                        maxLength={6}
                        value={validationInputs[o.oid] || ''}
                        onChange={e => setValidationInputs(prev => ({
                          ...prev, [o.oid]: e.target.value.toUpperCase(),
                        }))}
                      />
                      <button
                        className="oc-validate-btn"
                        disabled={validatingOid === o.oid || !(validationInputs[o.oid] || '').trim()}
                        onClick={async () => {
                          setValidatingOid(o.oid);
                          await handleValidateDelivery(
                            o.oid,
                            validationInputs[o.oid] || '',
                            () => setOrders(prev => prev.map(x =>
                              x.oid === o.oid ? { ...x, escrow_status: 'validated' } : x
                            ))
                          );
                          setValidatingOid(null);
                        }}
                      >
                        {validatingOid === o.oid
                          ? <><i className="fas fa-spinner fa-spin" /> Vérif…</>
                          : <><i className="fas fa-check" /> Valider</>
                        }
                      </button>
                    </div>
                    <p className="oc-validation-note">
                      <i className="fas fa-envelope" />
                      Code envoyé par e-mail lors de l'achat.
                    </p>
                  </div>
                )}

                {/* ── Ligne prix ── */}
                <div className="oc-card-price-row">
                  <span className="oc-price-label">{o.qty} × {fmtPrice(o.product?.price)} frs</span>
                  <span className="oc-price-value">
                    <span>Total</span>{fmtPrice(o.price)} frs
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
