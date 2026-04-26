// AddPresentation.jsx — Publier une vidéo de présentation
// Mobile-first · zéro Bootstrap · 2 étapes · prefix: pv-
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useLocation } from 'react-router-dom';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import './addpresentation.css';

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1a1a1a',
  color: '#fff',
});

// ─── Constraints (mirrors Django model) ──────────────────────────────────────
const TITLE_MAX    = 50;
const DESC_MAX     = 100;
const MAX_SIZE_MB  = 20;
const MAX_DURATION = 30;
const ALLOWED_EXT  = ['mp4', 'mov', 'webm', 'hevc', 'h265'];
const ALLOWED_MIME = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'video/hevc', 'video/h265', 'video/x-hevc',
];

const STEPS = ['Vidéo', 'Détails'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function AddPresentation() {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = UserData();

  const [step,       setStep]       = useState(0);
  const [isLoading,  setIsLoading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);

  const [videoFile,     setVideoFile]     = useState(null);
  const [videoPreview,  setVideoPreview]  = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');

  const fileInputRef = useRef(null);

  // ── Auto-open from BottomBar ───────────────────────────────────────────────
  useEffect(() => {
    if (location.state?.autoOpen) {
      const t = setTimeout(() => fileInputRef.current?.click(), 250);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line

  // ── Redirect non-vendor ────────────────────────────────────────────────────
  useEffect(() => {
    if (userData && userData.vendor_id === 0) navigate('/vendor/register/');
  }, [userData?.vendor_id]); // eslint-disable-line

  // ── Reset preview URL on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => { if (videoPreview) URL.revokeObjectURL(videoPreview); };
  }, [videoPreview]);

  // ── File validation + metadata read ───────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;

    // Type check
    const ext = file.name.split('.').pop().toLowerCase();
    const ok  = ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);
    if (!ok) {
      Toast.fire({ icon: 'warning', title: 'Format non supporté', text: 'Utilisez MP4, MOV ou WEBM.' });
      return;
    }

    // Size check
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      Toast.fire({ icon: 'warning', title: `Vidéo trop lourde`, text: `Maximum ${MAX_SIZE_MB} Mo.` });
      return;
    }

    // Duration check
    const objectUrl = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.preload = 'metadata';

    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (vid.duration > MAX_DURATION) {
        Toast.fire({ icon: 'warning', title: 'Vidéo trop longue', text: `Maximum ${MAX_DURATION} secondes.` });
        return;
      }
      setVideoDuration(Math.round(vid.duration));
      acceptFile(file);
    };

    vid.onerror = () => {
      // HEVC / format non lisible par le browser → on accepte quand même
      URL.revokeObjectURL(objectUrl);
      acceptFile(file);
    };

    vid.src = objectUrl;
  };

  const acceptFile = (file) => {
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setStep(1);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(null);
    setStep(0);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim())       { Toast.fire({ icon: 'warning', title: 'Le titre est requis.' }); return; }
    if (!description.trim()) { Toast.fire({ icon: 'warning', title: 'La description est requise.' }); return; }
    if (!videoFile)          { Toast.fire({ icon: 'warning', title: 'Aucune vidéo sélectionnée.' }); return; }

    setIsLoading(true);
    setUploadPct(0);

    try {
      const fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('description', description.trim());
      fd.append('video',       videoFile);

      await apiInstance.post('presentations/create/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
        },
      });

      Toast.fire({ icon: 'success', title: 'Vidéo publiée ✓' });
      navigate('/profile/');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.video?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Erreur lors de la publication.';
      Toast.fire({ icon: 'error', title: msg });
      setIsLoading(false);
    }
  };

  // ── Display helpers ────────────────────────────────────────────────────────
  const fmtDuration = (s) => (s ? `${s}s` : '');
  const fmtSize     = (b) => (b ? `${(b / (1024 * 1024)).toFixed(1)} Mo` : '');

  const titleWarn = title.length > TITLE_MAX * 0.85
    ? 'pv-char--danger'
    : title.length > TITLE_MAX * 0.7
      ? 'pv-char--warn' : '';

  const descWarn = description.length > DESC_MAX * 0.85
    ? 'pv-char--danger'
    : description.length > DESC_MAX * 0.7
      ? 'pv-char--warn' : '';

  const canPublish = title.trim() && description.trim() && !isLoading;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pv-page">

      {/* Hidden video input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="pv-file-hidden"
        onChange={handleFileSelect}
      />

      {/* ── Topbar ── */}
      <div className="pv-topbar">
        <button
          className="pv-back-btn"
          onClick={() => step > 0 ? resetVideo() : navigate(-1)}
          aria-label="Retour"
        >
          <i className="fas fa-arrow-left" />
        </button>
        <span className="pv-topbar-title">
          {step === 0 ? 'Nouvelle vidéo' : 'Détails'}
        </span>
        {step === 1 && (
          <button
            className={`pv-action-btn${canPublish ? '' : ' pv-action-btn--off'}`}
            onClick={handleSubmit}
            disabled={!canPublish}
          >
            {isLoading
              ? <div className="pv-btn-spinner" />
              : <><i className="fas fa-paper-plane" /> Publier</>
            }
          </button>
        )}
      </div>

      {/* ── Step indicator ── */}
      <div className="pv-steps">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`pv-step${i <= step ? ' pv-step--active' : ''}`}>
              <div className="pv-step-dot">
                {i < step
                  ? <i className="fas fa-check" />
                  : <span>{i + 1}</span>
                }
              </div>
              <span className="pv-step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`pv-step-line${i < step ? ' pv-step-line--done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ══════════ STEP 0 — SÉLECTION VIDÉO ══════════ */}
      {step === 0 && (
        <div className="pv-content">
          <div className="pv-drop-zone" onClick={() => fileInputRef.current?.click()}>

            {/* Animated rings */}
            <div className="pv-rings">
              <div className="pv-ring pv-ring--3" />
              <div className="pv-ring pv-ring--2" />
              <div className="pv-ring pv-ring--1" />
              <div className="pv-drop-icon">
                <i className="fas fa-video" />
              </div>
            </div>

            <p className="pv-drop-title">Ajouter une vidéo</p>
            <p className="pv-drop-sub">
              Présentez vos produits en vidéo courte.<br />
              Format portrait (9:16) recommandé.
            </p>

            <div className="pv-drop-cta">
              <i className="fas fa-film" /> Ouvrir la galerie
            </div>

            <div className="pv-drop-specs">
              <div className="pv-spec-chip">
                <i className="fas fa-clock" /> Max {MAX_DURATION}s
              </div>
              <div className="pv-spec-chip">
                <i className="fas fa-weight-hanging" /> Max {MAX_SIZE_MB} Mo
              </div>
              <div className="pv-spec-chip">
                <i className="fas fa-file-video" /> MP4 · MOV · WEBM
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════ STEP 1 — PRÉVIEW + FORMULAIRE ══════════ */}
      {step === 1 && (
        <div className="pv-step1">

          {/* ── Vidéo pleine largeur ── */}
          <div className="pv-video-block">
            {videoPreview && (
              <video
                src={videoPreview}
                className="pv-video-player"
                autoPlay
                loop
                muted
                playsInline
              />
            )}
            {/* Overlay TikTok-like */}
            <div className="pv-video-overlay">
              <div className="pv-video-overlay-top">
                {videoDuration && (
                  <span className="pv-duration-badge">
                    <i className="fas fa-clock" /> {fmtDuration(videoDuration)}
                  </span>
                )}
              </div>
              <div className="pv-video-overlay-bottom">
                {title && <p className="pv-ov-title">{title}</p>}
                {description && <p className="pv-ov-desc">{description}</p>}
              </div>
            </div>
          </div>

          {/* ── Méta + Changer ── */}
          <div className="pv-meta-bar">
            <div className="pv-meta-left">
              <span className="pv-meta-chip">
                <i className="fas fa-file-video" />
                {videoFile?.name?.split('.').pop().toUpperCase()}
              </span>
              {videoFile && (
                <span className="pv-meta-chip">
                  <i className="fas fa-hdd" /> {fmtSize(videoFile.size)}
                </span>
              )}
            </div>
            <button className="pv-change-btn" type="button" onClick={resetVideo}>
              <i className="fas fa-redo-alt" /> Changer
            </button>
          </div>

          {/* ── Formulaire ── */}
          <div className="pv-form-area">

            <div className="pv-form-card">
              <p className="pv-section-title">Informations</p>

              <div className="pv-field">
                <div className="pv-label-row">
                  <label className="pv-label">Titre <span className="pv-req">*</span></label>
                  <span className={`pv-char-count ${titleWarn}`}>{title.length}/{TITLE_MAX}</span>
                </div>
                <input
                  className="pv-input"
                  type="text"
                  placeholder="Ex : Nouvelle collection été…"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pv-field pv-field--last">
                <div className="pv-label-row">
                  <label className="pv-label">Description <span className="pv-req">*</span></label>
                  <span className={`pv-char-count ${descWarn}`}>{description.length}/{DESC_MAX}</span>
                </div>
                <textarea
                  className="pv-textarea"
                  rows={3}
                  placeholder="Décrivez vos produits, votre style…"
                  value={description}
                  maxLength={DESC_MAX}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Upload progress */}
            {isLoading && (
              <div className="pv-upload-card">
                <div className="pv-upload-header">
                  <div className="pv-upload-label">
                    <div className="pv-btn-spinner pv-btn-spinner--accent" />
                    Publication en cours…
                  </div>
                  <span className="pv-upload-pct">{uploadPct}%</span>
                </div>
                <div className="pv-progress-track">
                  <div className="pv-progress-bar" style={{ width: `${uploadPct}%` }} />
                </div>
                <p className="pv-upload-hint">Ne quittez pas cette page pendant l'envoi.</p>
              </div>
            )}

            {/* Publish CTA */}
            {!isLoading && (
              <button className="pv-publish-cta" onClick={handleSubmit} disabled={!canPublish}>
                <i className="fas fa-paper-plane" /> Publier la vidéo
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
