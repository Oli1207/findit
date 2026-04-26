// VendorSettings.jsx — Paramètres vendeur
// Mobile-first · zéro Bootstrap · onglets React · preview d'image
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import './vendorsettings.css';

const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1a1a1a',
  color: '#fff',
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function VendorSettings() {
  const navigate  = useNavigate();
  const userData  = UserData();

  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'profile'
  const [loading,   setLoading]   = useState(true);
  const [savingShop,    setSavingShop]    = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Boutique ───────────────────────────────────────────────────────────────
  const [shopData, setShopData] = useState({ name: '', description: '', mobile: '', slug: '' });
  const [shopImgSrc,  setShopImgSrc]  = useState('');   // URL pour affichage
  const [shopImgFile, setShopImgFile] = useState(null); // File pour envoi
  const shopInputRef = useRef(null);

  // ── Profil ─────────────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    full_name: '', about: '', city: '', state: '', country: '', address: '', email: '', phone: '',
  });
  const [profileImgSrc,  setProfileImgSrc]  = useState('');
  const [profileImgFile, setProfileImgFile] = useState(null);
  const profileInputRef = useRef(null);

  // ── Redirect non-vendor ────────────────────────────────────────────────────
  useEffect(() => {
    if (userData && userData.vendor_id === 0) navigate('/vendor/register/');
  }, [userData?.vendor_id]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.user_id && !userData?.vendor_id) return;

    const load = async () => {
      try {
        const [profileRes, shopRes] = await Promise.allSettled([
          userData?.user_id   ? apiInstance.get(`vendor-settings/${userData.user_id}/`)        : Promise.reject(),
          userData?.vendor_id ? apiInstance.get(`vendor-shop-settings/${userData.vendor_id}/`) : Promise.reject(),
        ]);

        if (profileRes.status === 'fulfilled') {
          const d = profileRes.value.data;
          setProfileData({
            full_name: d.full_name || '',
            about:     d.about     || '',
            city:      d.city      || '',
            state:     d.state     || '',
            country:   d.country   || '',
            address:   d.address   || '',
            email:     d.user?.email || '',
            phone:     d.user?.phone || '',
          });
          setProfileImgSrc(d.image || '');
        }
        if (shopRes.status === 'fulfilled') {
          const d = shopRes.value.data;
          setShopData({ name: d.name || '', description: d.description || '', mobile: d.mobile || '', slug: d.slug || '' });
          setShopImgSrc(d.image || '');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userData?.user_id, userData?.vendor_id]);

  // ── Image preview helper ───────────────────────────────────────────────────
  const handleImgSelect = (file, setSrc, setFile) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = e => setSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── Save boutique ──────────────────────────────────────────────────────────
  const saveShop = async (e) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const fd = new FormData();
      if (shopImgFile) fd.append('image', shopImgFile);
      fd.append('name',        shopData.name        || '');
      fd.append('description', shopData.description || '');
      fd.append('mobile',      shopData.mobile      || '');

      await apiInstance.patch(`vendor-shop-settings/${userData.vendor_id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShopImgFile(null);
      Toast.fire({ icon: 'success', title: 'Boutique mise à jour ✓' });
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSavingShop(false);
    }
  };

  // ── Save profil ────────────────────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const fd = new FormData();
      if (profileImgFile) fd.append('image', profileImgFile);
      fd.append('full_name', profileData.full_name || '');
      fd.append('about',     profileData.about     || '');
      fd.append('city',      profileData.city      || '');
      fd.append('state',     profileData.state     || '');
      fd.append('country',   profileData.country   || '');
      fd.append('address',   profileData.address   || '');

      await apiInstance.patch(`vendor-settings/${userData.user_id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfileImgFile(null);
      Toast.fire({ icon: 'success', title: 'Profil mis à jour ✓' });
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Loader ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="vs-page">
        <div className="vs-loader">
          <div className="vs-spinner" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="vs-page">

      {/* Topbar */}
      <div className="vs-topbar">
        <button className="vs-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <span className="vs-topbar-title">Paramètres</span>
        {shopData.slug && (
          <Link to="/profile/" className="vs-topbar-shop-link">
            <i className="fas fa-store" /> Ma boutique
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="vs-tabs">
        <button
          className={`vs-tab${activeTab === 'shop' ? ' vs-tab--active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          <i className="fas fa-store" /> Boutique
        </button>
        <button
          className={`vs-tab${activeTab === 'profile' ? ' vs-tab--active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user" /> Profil
        </button>
        <button
          className={`vs-tab${activeTab === 'verification' ? ' vs-tab--active' : ''}`}
          onClick={() => setActiveTab('verification')}
          style={{ position:'relative' }}
        >
          <i className="fas fa-id-card" /> Badge bleu
        </button>
      </div>

      {/* ══════════ ONGLET BOUTIQUE ══════════ */}
      {activeTab === 'shop' && (
        <form onSubmit={saveShop}>
          <div className="vs-content">

            {/* Avatar boutique */}
            <div className="vs-avatar-card">
              <div className="vs-avatar-ring">
                {shopImgSrc
                  ? <img src={shopImgSrc} alt="Boutique" />
                  : <div className="vs-avatar-placeholder"><i className="fas fa-store" /></div>
                }
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="vs-avatar-name">{shopData.name || 'Votre boutique'}</p>
                <p className="vs-avatar-sub">{shopData.description || 'Aucune description.'}</p>
              </div>
              <label className="vs-upload-label">
                <i className="fas fa-camera" /> Changer la photo
                <input
                  ref={shopInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleImgSelect(e.target.files[0], setShopImgSrc, setShopImgFile)}
                />
              </label>
            </div>

            {/* Infos boutique */}
            <div className="vs-form-card">
              <p className="vs-form-section-title">Informations de la boutique</p>

              <div className="vs-field">
                <label className="vs-label">Nom de la boutique</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Ex : Ma Super Boutique"
                  value={shopData.name}
                  onChange={e => setShopData(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">Description</label>
                <textarea
                  className="vs-textarea"
                  placeholder="Décrivez votre boutique en quelques mots…"
                  value={shopData.description}
                  onChange={e => setShopData(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">Téléphone boutique</label>
                <input
                  className="vs-input"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={shopData.mobile}
                  onChange={e => setShopData(p => ({ ...p, mobile: e.target.value }))}
                />
              </div>
            </div>

            {/* Bouton save */}
            <button className="vs-save-btn" type="submit" disabled={savingShop}>
              {savingShop
                ? <><div className="vs-btn-spinner" /> Sauvegarde…</>
                : <><i className="fas fa-check" /> Enregistrer la boutique</>
              }
            </button>

          </div>
        </form>
      )}

      {/* ══════════ ONGLET PROFIL ══════════ */}
      {activeTab === 'profile' && (
        <form onSubmit={saveProfile}>
          <div className="vs-content">

            {/* Avatar profil */}
            <div className="vs-avatar-card">
              <div className="vs-avatar-ring">
                {profileImgSrc
                  ? <img src={profileImgSrc} alt="Profil" />
                  : <div className="vs-avatar-placeholder"><i className="fas fa-user" /></div>
                }
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="vs-avatar-name">{profileData.full_name || 'Votre nom'}</p>
                <p className="vs-avatar-sub">{profileData.email}</p>
              </div>
              <label className="vs-upload-label">
                <i className="fas fa-camera" /> Changer la photo
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleImgSelect(e.target.files[0], setProfileImgSrc, setProfileImgFile)}
                />
              </label>
            </div>

            {/* Infos personnelles */}
            <div className="vs-form-card">
              <p className="vs-form-section-title">Informations personnelles</p>

              <div className="vs-field">
                <label className="vs-label">Nom complet</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Votre nom complet"
                  value={profileData.full_name}
                  onChange={e => setProfileData(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">À propos</label>
                <textarea
                  className="vs-textarea"
                  placeholder="Parlez un peu de vous…"
                  value={profileData.about}
                  onChange={e => setProfileData(p => ({ ...p, about: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">E-mail (non modifiable)</label>
                <input
                  className="vs-input vs-input--readonly"
                  type="email"
                  value={profileData.email}
                  readOnly
                />
              </div>

              {profileData.phone && (
                <div className="vs-field">
                  <label className="vs-label">Téléphone (non modifiable)</label>
                  <input
                    className="vs-input vs-input--readonly"
                    type="tel"
                    value={profileData.phone}
                    readOnly
                  />
                </div>
              )}
            </div>

            {/* Adresse */}
            <div className="vs-form-card">
              <p className="vs-form-section-title">Adresse de livraison</p>

              <div className="vs-field">
                <label className="vs-label">Adresse</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Numéro et nom de rue"
                  value={profileData.address}
                  onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">Ville</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Abidjan, Dakar…"
                  value={profileData.city}
                  onChange={e => setProfileData(p => ({ ...p, city: e.target.value }))}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">Région / État</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Lagunes, Dakar…"
                  value={profileData.state}
                  onChange={e => setProfileData(p => ({ ...p, state: e.target.value }))}
                />
              </div>

              <div className="vs-field">
                <label className="vs-label">Pays</label>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="Côte d'Ivoire, Sénégal…"
                  value={profileData.country}
                  onChange={e => setProfileData(p => ({ ...p, country: e.target.value }))}
                />
              </div>
            </div>

            {/* Bouton save */}
            <button className="vs-save-btn" type="submit" disabled={savingProfile}>
              {savingProfile
                ? <><div className="vs-btn-spinner" /> Sauvegarde…</>
                : <><i className="fas fa-check" /> Enregistrer le profil</>
              }
            </button>

            {/* Zone danger */}
            <div className="vs-danger-card">
              <div>
                <p className="vs-danger-title">Se déconnecter</p>
                <p className="vs-danger-sub">Terminer la session sur cet appareil.</p>
              </div>
              <button
                type="button"
                className="vs-danger-btn"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login/';
                }}
              >
                Déconnexion
              </button>
            </div>

          </div>
        </form>
      )}

      {/* ══════════ ONGLET BADGE BLEU ══════════ */}
      {activeTab === 'verification' && <VerificationTab />}

    </div>
  );
}

// ─── Onglet vérification identité ────────────────────────────────────────────
function VerificationTab() {
  const STEPS = [
    { key: 'id_front', label: 'Recto CNI', hint: 'Cadre ta carte d\'identité recto face caméra' },
    { key: 'id_back',  label: 'Verso CNI', hint: 'Retourne ta CNI — montre le verso' },
    { key: 'selfie',   label: 'Selfie + CNI', hint: 'Tiens ta CNI sous le menton, regarde la caméra' },
  ];

  const [step,     setStep]     = useState(0);     // 0,1,2 = photos, 3 = confirm
  const [photos,   setPhotos]   = useState({});     // { id_front: base64, id_back, selfie }
  const [streaming, setStreaming] = useState(false);
  const [sending,   setSending]  = useState(false);
  const [status,    setStatus]   = useState(null);  // loaded from API
  const [loadingStatus, setLoadingStatus] = useState(true);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Charger le statut actuel
  useEffect(() => {
    apiInstance.get('vendor/verification-status/')
      .then(({ data }) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
    return () => stopStream();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      Toast.fire({ icon: 'error', title: 'Impossible d\'accéder à la caméra. Autorisez-la dans votre navigateur.' });
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  };

  const takePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    const key = STEPS[step].key;
    setPhotos((prev) => ({ ...prev, [key]: dataUrl }));
    stopStream();
  };

  const retake = () => {
    const key = STEPS[step].key;
    setPhotos((prev) => { const c = { ...prev }; delete c[key]; return c; });
    startCamera();
  };

  const nextStep = () => {
    stopStream();
    if (step < STEPS.length - 1) { setStep(step + 1); }
    else { setStep(3); }  // all done → confirm screen
  };

  const submit = async () => {
    setSending(true);
    try {
      await apiInstance.post('vendor/request-verification/', {
        id_front: photos.id_front,
        id_back:  photos.id_back,
        selfie:   photos.selfie,
      });
      Toast.fire({ icon: 'success', title: 'Demande envoyée !' });
      setStatus({ status: 'pending', verified: false });
      setStep(0);
      setPhotos({});
    } catch (e) {
      Toast.fire({ icon: 'error', title: e.response?.data?.detail || 'Erreur réseau.' });
    } finally { setSending(false); }
  };

  const currentKey = STEPS[step]?.key;
  const photoTaken = !!photos[currentKey];

  if (loadingStatus) return <div className="adm-spinner" style={{ margin:'60px auto' }} />;

  // Déjà vérifié
  if (status?.verified) return (
    <div style={{ textAlign:'center', padding:'50px 20px' }}>
      <div style={{ width:70, height:70, background:'#2563eb', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:32, color:'#fff' }}>
        <i className="fas fa-check" />
      </div>
      <h3 style={{ color:'#f0f0f0', fontSize:20, fontWeight:800 }}>Identité vérifiée ✓</h3>
      <p style={{ color:'#888', fontSize:14, marginTop:8 }}>Ton badge bleu est actif sur ton profil public.</p>
    </div>
  );

  // En attente de traitement
  if (status?.status === 'pending') return (
    <div style={{ textAlign:'center', padding:'50px 20px' }}>
      <div style={{ fontSize:52, marginBottom:16 }}>⏳</div>
      <h3 style={{ color:'#f0f0f0', fontSize:18, fontWeight:700 }}>Demande en cours d'examen</h3>
      <p style={{ color:'#888', fontSize:14, marginTop:8, maxWidth:320, margin:'8px auto 0' }}>
        Un admin va examiner tes photos sous 48h. Tu recevras le badge bleu une fois approuvé.
      </p>
    </div>
  );

  // Rejeté — peut resoumettre
  const rejectedMsg = status?.status === 'rejected' ? status?.admin_notes : null;

  // Step 0–2 : prise de photos
  if (step < 3) {
    const s = STEPS[step];
    return (
      <div style={{ maxWidth:420, margin:'0 auto', padding:'0 4px' }}>
        {rejectedMsg && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 14px', marginBottom:20, color:'#f87171', fontSize:13 }}>
            <i className="fas fa-times-circle" style={{ marginRight:8 }} />
            Demande rejetée : {rejectedMsg}
          </div>
        )}

        {/* Indicateur étapes */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20 }}>
          {STEPS.map((st, i) => (
            <div key={st.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', border:`2px solid ${i <= step ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                background: i < step ? '#2563eb' : (i === step ? 'rgba(37,99,235,0.15)' : 'transparent'),
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color: i < step ? '#fff' : (i === step ? '#60a5fa' : '#555') }}>
                {i < step ? <i className="fas fa-check" /> : i + 1}
              </div>
              <span style={{ fontSize:10, color: i === step ? '#60a5fa' : '#555', fontWeight: i === step ? 700 : 400 }}>{st.label}</span>
            </div>
          ))}
        </div>

        <h3 style={{ color:'#f0f0f0', fontSize:16, fontWeight:700, textAlign:'center', marginBottom:6 }}>{s.label}</h3>
        <p style={{ color:'#888', fontSize:13, textAlign:'center', marginBottom:16 }}>{s.hint}</p>

        {/* Caméra / photo prise */}
        <div style={{ position:'relative', width:'100%', aspectRatio:'4/3', background:'#0a0a0a', borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', marginBottom:14 }}>
          {streaming && !photoTaken && (
            <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          )}
          {photoTaken && (
            <img src={photos[currentKey]} alt="photo prise" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          )}
          {!streaming && !photoTaken && (
            <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'#555' }}>
              <i className="fas fa-camera" style={{ fontSize:40 }} />
              <span style={{ fontSize:13 }}>La caméra apparaîtra ici</span>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display:'none' }} />
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {!streaming && !photoTaken && (
            <button onClick={startCamera} style={{ padding:'14px', background:'#2563eb', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="fas fa-camera" /> Ouvrir la caméra
            </button>
          )}
          {streaming && !photoTaken && (
            <button onClick={takePhoto} style={{ padding:'14px', background:'#DF468F', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="fas fa-circle" /> Prendre la photo
            </button>
          )}
          {photoTaken && (
            <>
              <button onClick={nextStep} style={{ padding:'14px', background:'#22c55e', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                {step < STEPS.length - 1 ? 'Photo suivante →' : 'Vérifier & envoyer'}
              </button>
              <button onClick={retake} style={{ padding:'12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#aaa', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                <i className="fas fa-redo" style={{ marginRight:6 }} />Reprendre
              </button>
            </>
          )}
        </div>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, textAlign:'center', marginTop:14 }}>
          Uniquement pris en direct — aucun upload de fichier n'est possible.
        </p>
      </div>
    );
  }

  // Step 3 : confirmation finale
  return (
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <h3 style={{ color:'#f0f0f0', fontSize:16, fontWeight:700, textAlign:'center', marginBottom:16 }}>Confirme tes photos</h3>
      <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
        {STEPS.map((s) => (
          <div key={s.key} style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#888', marginBottom:6, textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>{s.label}</div>
            <img src={photos[s.key]} alt={s.label} style={{ width:100, height:75, objectFit:'cover', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)' }} />
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={sending} style={{ width:'100%', padding:'14px', background:'#2563eb', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        {sending ? <><i className="fas fa-spinner fa-spin" /> Envoi…</> : <><i className="fas fa-paper-plane" /> Envoyer la demande</>}
      </button>
      <button onClick={() => { setStep(0); stopStream(); }} style={{ width:'100%', marginTop:10, padding:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'#888', fontWeight:600, fontSize:14, cursor:'pointer' }}>
        ← Recommencer
      </button>
      <p style={{ color:'rgba(255,255,255,0.25)', fontSize:11, textAlign:'center', marginTop:14 }}>
        Tes photos seront examinées manuellement par notre équipe.
        Badge accordé sous 48h si tout est conforme.
      </p>
    </div>
  );
}
