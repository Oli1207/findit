// OrdersVendorTiktok.jsx — Commandes reçues (Vendor)
// Mobile-first · bannière image · escrow · contact client
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import { useEscrowOrder } from '../../hooks/useEscrowOrder';
import './ordersvendortiktok.css';

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

const TABS = [
  { key: 'all',       label: 'Tout' },
  { key: 'pending',   label: 'En attente' },
  { key: 'shipped',   label: 'Expédié' },
  { key: 'done',      label: 'Validé' },
];
function matchesTab(o, tab) {
  if (tab === 'all') return true;
  const s = (o.escrow_status || '').toLowerCase();
  if (tab === 'pending')  return ['pending', 'paid_holding'].includes(s);
  if (tab === 'shipped')  return s === 'shipped';
  if (tab === 'done')     return ['validated', 'released'].includes(s);
  return true;
}
function pillInfo(escrow) {
  if (escrow === 'paid_holding') return { cls: 'warning', txt: 'Payé' };
  if (escrow === 'shipped')      return { cls: 'info',    txt: 'Expédié' };
  if (escrow === 'validated')    return { cls: 'success', txt: 'Validé' };
  if (escrow === 'released')     return { cls: 'success', txt: 'Versé' };
  return { cls: 'warning', txt: 'En attente' };
}

function Skeleton() {
  return <div className="vo-skel" />;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function OrdersVendorTiktok() {
  const userData = UserData();
  const navigate = useNavigate();

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('all');
  const [shippingOid, setShippingOid] = useState(null);
  const [revealedPhones, setRevealedPhones] = useState({});

  // ── Redirect if not vendor ─────────────────────────────────────────────────
  useEffect(() => {
    if (userData && userData.vendor_id === 0) {
      navigate('/vendor/register/');
    }
  }, [userData?.vendor_id]);

  // ── Escrow hook ────────────────────────────────────────────────────────────
  const { handleMarkShipped } = useEscrowOrder({
    userData,
    qtyValue: 1,
    sizeValue: 'No Size',
    colorValue: 'No Color',
    profileData: null,
    useProfileAddress: false,
    customAddress: {},
  });

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!userData?.vendor_id) return;
    try {
      const res = await apiInstance.get(`vendor/orders/${userData.vendor_id}/`);
      setOrders(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userData?.vendor_id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Start conversation with buyer ──────────────────────────────────────────
  const handleContact = async (buyerId) => {
    if (!buyerId || !userData?.vendor_id) return;
    try {
      const res = await apiInstance.post('conversations/', {
        user_id:   buyerId,
        vendor_id: userData.vendor_id,
      });
      navigate(`/vendor/chat/${res.data.id}`);
    } catch {
      navigate('/vendor/messages/');
    }
  };

  // ── Filtered + stats ───────────────────────────────────────────────────────
  const filtered = orders.filter(o => matchesTab(o, activeTab));
  const counts   = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? 0 : orders.filter(o => matchesTab(o, t.key)).length;
    return acc;
  }, {});

  const totalRevenue = orders
    .filter(o => ['validated', 'released'].includes((o.escrow_status || '').toLowerCase()))
    .reduce((s, o) => s + Number(o.price || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="vo-page">

      {/* Topbar */}
      <div className="vo-topbar">
        <button className="vo-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <span className="vo-topbar-title">Commandes reçues</span>
        <div className="vo-topbar-actions">
          <button className="vo-topbar-icon-btn" onClick={() => navigate('/vendor/messages/')} aria-label="Messages">
            <i className="fas fa-comment-alt" />
          </button>
          <button className="vo-topbar-icon-btn" onClick={() => navigate('/vendor/settings/')} aria-label="Paramètres">
            <i className="fas fa-cog" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div className="vo-stats">
          <div className="vo-stat">
            <span className="vo-stat-num">{orders.length}</span>
            <span className="vo-stat-label">Total</span>
          </div>
          <div className="vo-stat">
            <span className="vo-stat-num vo-stat-num--accent">
              {orders.filter(o => (o.escrow_status || '').toLowerCase() === 'paid_holding').length}
            </span>
            <span className="vo-stat-label">À expédier</span>
          </div>
          <div className="vo-stat">
            <span className="vo-stat-num">
              {orders.filter(o => (o.escrow_status || '').toLowerCase() === 'shipped').length}
            </span>
            <span className="vo-stat-label">En transit</span>
          </div>
          <div className="vo-stat">
            <span className="vo-stat-num" style={{ fontSize: 13 }}>
              {fmtPrice(totalRevenue)} frs
            </span>
            <span className="vo-stat-label">Revenus</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="vo-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`vo-tab${activeTab === t.key ? ' vo-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && (
              <span className="vo-tab-badge">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="vo-feed">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="vo-empty">
            <i className="fas fa-box-open" />
            <p className="vo-empty-title">
              {activeTab === 'all' ? 'Aucune commande reçue' : `Aucune commande "${TABS.find(t => t.key === activeTab)?.label}"`}
            </p>
            {activeTab === 'all' && (
              <p className="vo-empty-sub">Vos commandes apparaîtront ici dès que des clients achètent vos produits.</p>
            )}
          </div>
        ) : (
          filtered.map(o => {
            const escrow = (o.escrow_status || '').toLowerCase();
            const pill   = pillInfo(escrow);
            const phoneVisible = revealedPhones[o.oid];

            return (
              <div key={o.oid} className="vo-card">

                {/* Bannière image */}
                <div className="vo-banner">
                  {o.product?.image
                    ? <img src={o.product.image} alt={o.product?.title} />
                    : <div className="vo-banner-placeholder"><i className="fas fa-image" /></div>
                  }
                  <span className={`vo-status-pill vo-status-pill--${pill.cls}`}>{pill.txt}</span>
                </div>

                {/* Corps */}
                <div className="vo-card-body">
                  <div className="vo-card-meta-row">
                    <span className="vo-card-oid">#{o.oid}</span>
                    <span className="vo-card-date">
                      <i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />{fmtDate(o.date)}
                    </span>
                  </div>
                  <p className="vo-card-title">{o.product?.title || 'Produit'}</p>
                  <p className="vo-card-customer">
                    <i className="fas fa-user" />
                    {o.full_name || o.buyer?.full_name || 'Client'}
                  </p>
                </div>

                {/* Chips */}
                <div className="vo-chips">
                  {o.qty > 0 && <span className="vo-chip"><i className="fas fa-layer-group" />{o.qty} art.</span>}
                  {o.size  && o.size  !== 'No Size'  && <span className="vo-chip"><i className="fas fa-ruler" />{o.size}</span>}
                  {o.color && o.color !== 'No Color' && <span className="vo-chip"><i className="fas fa-palette" />{o.color}</span>}
                  {o.city  && <span className="vo-chip"><i className="fas fa-map-marker-alt" />{o.city}</span>}
                  {o.address && <span className="vo-chip"><i className="fas fa-home" />{o.address}</span>}
                </div>

                {/* Téléphone (révélation au tap) */}
                {o.mobile && (
                  <div className="vo-phone-row">
                    {phoneVisible ? (
                      <span className="vo-phone-value">
                        <i className="fas fa-phone" style={{ marginRight: 6, color: '#059669' }} />
                        {o.mobile}
                      </span>
                    ) : (
                      <button
                        className="vo-phone-reveal-btn"
                        onClick={() => setRevealedPhones(p => ({ ...p, [o.oid]: true }))}
                      >
                        <i className="fas fa-phone" /> Voir le numéro
                      </button>
                    )}
                  </div>
                )}

                {/* Prix */}
                <div className="vo-price-row">
                  <span className="vo-price-label">{o.qty} × {fmtPrice(o.product?.price)} frs</span>
                  <strong className="vo-price-value">{fmtPrice(o.price)} frs</strong>
                </div>

                {/* Actions */}
                <div className="vo-actions">

                  {/* Escrow actions */}
                  {escrow === 'paid_holding' && (
                    <button
                      className="vo-btn-ship"
                      disabled={shippingOid === o.oid}
                      onClick={async () => {
                        setShippingOid(o.oid);
                        await handleMarkShipped(o.oid, (oid) =>
                          setOrders(prev => prev.map(x =>
                            x.oid === oid ? { ...x, escrow_status: 'shipped' } : x
                          ))
                        );
                        setShippingOid(null);
                      }}
                    >
                      {shippingOid === o.oid
                        ? <><i className="fas fa-spinner fa-spin" /> Traitement…</>
                        : <><i className="fas fa-truck" /> Marquer comme expédié</>
                      }
                    </button>
                  )}
                  {escrow === 'shipped' && (
                    <div className="vo-escrow-badge vo-badge--shipped">
                      <i className="fas fa-truck" /> Expédié — en attente de validation client
                    </div>
                  )}
                  {escrow === 'validated' && (
                    <div className="vo-escrow-badge vo-badge--validated">
                      <i className="fas fa-check-circle" /> Livraison validée — paiement en cours
                    </div>
                  )}
                  {escrow === 'released' && (
                    <div className="vo-escrow-badge vo-badge--released">
                      <i className="fas fa-coins" /> Paiement reversé sur votre compte
                    </div>
                  )}

                  {/* Bouton contacter (toujours disponible) */}
                  <button
                    className="vo-btn-contact"
                    onClick={() => handleContact(o.buyer?.id || o.user)}
                  >
                    <i className="fas fa-comment-alt" /> Contacter le client
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
