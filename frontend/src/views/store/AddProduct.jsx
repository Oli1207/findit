// AddProduct.jsx — Création de produit
// Mobile-first · zéro Bootstrap · 3 étapes · prefix: ap-
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import ReactCrop, { centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useNavigate, useLocation } from 'react-router-dom';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import { getCroppedImgFile } from '../../utils/canvasUtils';
import './addproduct.css';

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1a1a1a',
  color: '#fff',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MAX_PHOTOS = 5; // 1 cover + 4 gallery

function initCrop(w, h) {
  return centerCrop({ unit: '%', width: 90, height: 90 }, w, h);
}

const COLOR_NAMES = {
  '#ffffff': 'Blanc',   '#000000': 'Noir',    '#ff0000': 'Rouge',
  '#00ff00': 'Vert',    '#0000ff': 'Bleu',    '#ffff00': 'Jaune',
  '#ffa500': 'Orange',  '#800080': 'Violet',  '#808080': 'Gris',
  '#ffc0cb': 'Rose',    '#a52a2a': 'Marron',  '#c0c0c0': 'Argent',
  '#ffd700': 'Or',
};

const STEPS = ['Photos', 'Détails', 'Options'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function AddProduct() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const userData  = UserData();

  const [step,       setStep]      = useState(0);
  const [isLoading,  setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // ── Product fields ─────────────────────────────────────────────────────────
  const [product, setProduct] = useState({
    title: '', description: '', category: '', price: '', stock_qty: '',
  });
  const [images, setImages] = useState([]); // [{ file, preview }] index 0 = cover
  const [sizes,  setSizes]  = useState([]);
  const [colors, setColors] = useState([]);
  const [newSize,  setNewSize]  = useState('');
  const [newColor, setNewColor] = useState('#df468f');

  // ── Crop state ─────────────────────────────────────────────────────────────
  const [cropOpen,   setCropOpen]   = useState(false);
  const [imageSrc,   setImageSrc]   = useState(null);
  const [crop,       setCrop]       = useState();
  const [cropTarget, setCropTarget] = useState(null); // index | 'new'
  const imgRef      = useRef(null);
  const fileInputRef = useRef(null);

  // ── Fetch categories ───────────────────────────────────────────────────────
  useEffect(() => {
    apiInstance.get('category/').then(res => {
      setCategories(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  // ── Auto-open gallery if navigated from BottomBar ──────────────────────────
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

  // ── File select → open crop ────────────────────────────────────────────────
  const handleFileSelect = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;
    setCropTarget(target);
    setCrop(undefined);
    const reader = new FileReader();
    reader.onloadend = () => { setImageSrc(reader.result); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  const onImageLoaded = useCallback((img) => {
    imgRef.current = img;
    setCrop(initCrop(img.naturalWidth, img.naturalHeight));
    return false;
  }, []);

  const handleCropDone = async () => {
    if (!imgRef.current || !crop?.width || !crop?.height) return;
    setIsLoading(true);
    try {
      const scaleX = imgRef.current.naturalWidth  / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      const px = {
        x: crop.x * scaleX, y: crop.y * scaleY,
        width: crop.width * scaleX, height: crop.height * scaleY,
      };
      const file    = await getCroppedImgFile(imgRef.current, px, `photo_${Date.now()}.jpg`);
      const preview = URL.createObjectURL(file);
      const newImg  = { file, preview };

      if (cropTarget === 'new') {
        setImages(prev => prev.length < MAX_PHOTOS ? [...prev, newImg] : prev);
      } else {
        setImages(prev => prev.map((img, i) => i === cropTarget ? newImg : img));
      }
      setCropOpen(false); setImageSrc(null); setCrop(undefined); setCropTarget(null);
    } catch {
      Toast.fire({ icon: 'error', title: "Erreur de traitement de l'image." });
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  // ── Sizes ──────────────────────────────────────────────────────────────────
  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (s && !sizes.includes(s)) { setSizes(p => [...p, s]); setNewSize(''); }
  };

  // ── Colors ─────────────────────────────────────────────────────────────────
  const addColor = () => {
    const name = COLOR_NAMES[newColor.toLowerCase()] || 'Personnalisé';
    if (!colors.find(c => c.code === newColor)) setColors(p => [...p, { code: newColor, name }]);
  };

  // ── Step validation ────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 0) return images.length > 0;
    if (step === 1) return product.title && product.price && product.stock_qty && product.category;
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       product.title);
      fd.append('description', product.description);
      fd.append('category',    product.category);
      fd.append('price',       product.price);
      fd.append('stock_qty',   product.stock_qty);
      fd.append('vendor',      userData.vendor_id);
      if (images[0]) fd.append('image', images[0].file);
      images.slice(1).forEach((img, i) => fd.append(`gallery[${i}][image]`, img.file));
      sizes.forEach((s, i)  => fd.append(`sizes[${i}][name]`, s));
      colors.forEach((c, i) => {
        fd.append(`colors[${i}][name]`,       c.name);
        fd.append(`colors[${i}][color_code]`, c.code);
      });

      await apiInstance.post('vendor-create-product/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Toast.fire({ icon: 'success', title: 'Produit publié ✓' });
      navigate('/profile/');
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur lors de la publication.' });
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ap-page">

      {/* Hidden file input (shared) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="ap-file-hidden"
        onChange={e => handleFileSelect(e, 'new')}
      />

      {/* ── Topbar ── */}
      <div className="ap-topbar">
        <button
          className="ap-back-btn"
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          aria-label="Retour"
        >
          <i className="fas fa-arrow-left" />
        </button>
        <span className="ap-topbar-title">
          {step === 0 ? 'Ajouter des photos' : step === 1 ? 'Détails du produit' : 'Options'}
        </span>
        {step < 2 ? (
          <button
            className={`ap-action-btn${canProceed() ? '' : ' ap-action-btn--off'}`}
            onClick={() => canProceed() && setStep(s => s + 1)}
            disabled={!canProceed()}
          >
            Suivant <i className="fas fa-chevron-right" />
          </button>
        ) : (
          <button
            className="ap-action-btn"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <><div className="ap-btn-spinner" /></>
              : <><i className="fas fa-paper-plane" /> Publier</>
            }
          </button>
        )}
      </div>

      {/* ── Step indicator ── */}
      <div className="ap-steps">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`ap-step${i <= step ? ' ap-step--active' : ''}`}>
              <div className="ap-step-dot">
                {i < step ? <i className="fas fa-check" /> : <span>{i + 1}</span>}
              </div>
              <span className="ap-step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`ap-step-line${i < step ? ' ap-step-line--done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ══════════ STEP 0 — PHOTOS ══════════ */}
      {step === 0 && (
        <div className="ap-content">
          {images.length === 0 ? (
            /* Empty state */
            <div className="ap-drop-zone" onClick={() => fileInputRef.current?.click()}>
              <div className="ap-drop-icon">
                <i className="fas fa-images" />
              </div>
              <p className="ap-drop-title">Ajouter des photos</p>
              <p className="ap-drop-sub">
                Choisissez jusqu'à {MAX_PHOTOS} photos depuis votre galerie.<br />
                La première sera la photo de couverture.
              </p>
              <div className="ap-drop-cta">
                <i className="fas fa-image" /> Ouvrir la galerie
              </div>
            </div>
          ) : (
            <div className="ap-photos-section">

              {/* Grid */}
              <div className="ap-photos-grid">

                {/* Cover (always first, spans full width) */}
                <div className="ap-photo-cover">
                  <img src={images[0].preview} alt="cover" />
                  <span className="ap-cover-badge">
                    <i className="fas fa-star" /> Couverture
                  </span>
                  <button
                    className="ap-photo-remove"
                    onClick={() => removeImage(0)}
                    aria-label="Supprimer"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>

                {/* Gallery thumbnails */}
                {images.slice(1).map((img, i) => (
                  <div key={i + 1} className="ap-photo-thumb">
                    <img src={img.preview} alt={`photo ${i + 2}`} />
                    <button
                      className="ap-photo-remove"
                      onClick={() => removeImage(i + 1)}
                      aria-label="Supprimer"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ))}

                {/* Add slot */}
                {images.length < MAX_PHOTOS && (
                  <div
                    className="ap-photo-add"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Ajouter une photo"
                  >
                    <i className="fas fa-plus" />
                    <span>Ajouter</span>
                  </div>
                )}
              </div>

              <p className="ap-photos-hint">
                <i className="fas fa-info-circle" />
                {images.length}/{MAX_PHOTOS} photos · La 1ère = couverture
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ STEP 1 — DÉTAILS ══════════ */}
      {step === 1 && (
        <div className="ap-content">

          {/* Thumb strip */}
          <div className="ap-thumb-strip">
            {images.slice(0, 4).map((img, i) => (
              <img key={i} src={img.preview} alt="" className="ap-thumb-item" />
            ))}
            {images.length > 4 && (
              <div className="ap-thumb-more">+{images.length - 4}</div>
            )}
            <span className="ap-thumb-label">{images.length} photo{images.length > 1 ? 's' : ''}</span>
          </div>

          <div className="ap-form-card">
            <p className="ap-section-title">Informations essentielles</p>

            <div className="ap-field">
              <label className="ap-label">Titre du produit <span className="ap-req">*</span></label>
              <input
                className="ap-input"
                type="text"
                placeholder="Ex : Robe en soie noire, Sneakers vintage…"
                value={product.title}
                onChange={e => setProduct(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="ap-field">
              <label className="ap-label">Catégorie <span className="ap-req">*</span></label>
              <select
                className="ap-select"
                value={product.category}
                onChange={e => setProduct(p => ({ ...p, category: e.target.value }))}
              >
                <option value="">Choisir une catégorie…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="ap-field-row">
              <div className="ap-field ap-field--half">
                <label className="ap-label">Prix (FCFA) <span className="ap-req">*</span></label>
                <input
                  className="ap-input"
                  type="number"
                  placeholder="5 000"
                  min="0"
                  value={product.price}
                  onChange={e => setProduct(p => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div className="ap-field ap-field--half">
                <label className="ap-label">Quantité <span className="ap-req">*</span></label>
                <input
                  className="ap-input"
                  type="number"
                  placeholder="1"
                  min="1"
                  value={product.stock_qty}
                  onChange={e => setProduct(p => ({ ...p, stock_qty: e.target.value }))}
                />
              </div>
            </div>

            <div className="ap-field ap-field--last">
              <label className="ap-label">Description</label>
              <textarea
                className="ap-textarea"
                rows={4}
                placeholder="Matière, état, dimensions, marque… tout ce qui aide l'acheteur."
                value={product.description}
                onChange={e => setProduct(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <p className="ap-required-note">
            <span className="ap-req">*</span> Champs obligatoires
          </p>
        </div>
      )}

      {/* ══════════ STEP 2 — OPTIONS ══════════ */}
      {step === 2 && (
        <div className="ap-content">

          <div className="ap-info-banner">
            <i className="fas fa-magic" />
            <div>
              <p className="ap-info-banner-title">Options facultatives</p>
              <p className="ap-info-banner-sub">Tailles et couleurs améliorent vos ventes. Vous pouvez les ajouter plus tard.</p>
            </div>
          </div>

          {/* Tailles */}
          <div className="ap-form-card">
            <p className="ap-section-title">Tailles disponibles</p>
            <div className="ap-field ap-field--last">
              {sizes.length > 0 && (
                <div className="ap-chips">
                  {sizes.map(s => (
                    <span key={s} className="ap-chip">
                      {s}
                      <button
                        type="button"
                        className="ap-chip-remove"
                        onClick={() => setSizes(p => p.filter(x => x !== s))}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="ap-chip-input-row">
                <input
                  className="ap-input"
                  type="text"
                  placeholder="XS  S  M  L  XL  38  40…"
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSize())}
                />
                <button className="ap-add-btn" type="button" onClick={addSize}>
                  <i className="fas fa-plus" />
                </button>
              </div>
            </div>
          </div>

          {/* Couleurs */}
          <div className="ap-form-card">
            <p className="ap-section-title">Couleurs disponibles</p>
            <div className="ap-field ap-field--last">
              {colors.length > 0 && (
                <div className="ap-chips">
                  {colors.map(c => (
                    <span key={c.code} className="ap-chip">
                      <span className="ap-chip-swatch" style={{ background: c.code }} />
                      {c.name}
                      <button
                        type="button"
                        className="ap-chip-remove"
                        onClick={() => setColors(p => p.filter(x => x.code !== c.code))}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="ap-chip-input-row">
                <input
                  type="color"
                  className="ap-color-picker"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                />
                <span className="ap-color-name">
                  {COLOR_NAMES[newColor.toLowerCase()] || 'Couleur personnalisée'}
                </span>
                <button className="ap-add-btn" type="button" onClick={addColor}>
                  <i className="fas fa-plus" />
                </button>
              </div>
            </div>
          </div>

          {/* Publish CTA */}
          <button
            className="ap-publish-cta"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <><div className="ap-btn-spinner" /> Publication en cours…</>
              : <><i className="fas fa-paper-plane" /> Publier le produit</>
            }
          </button>

        </div>
      )}

      {/* ══════════ CROP MODAL ══════════ */}
      {cropOpen && (
        <div className="ap-crop-overlay">
          <div className="ap-crop-modal">
            <div className="ap-crop-header">
              <button
                className="ap-crop-cancel"
                onClick={() => { setCropOpen(false); setImageSrc(null); setCrop(undefined); setCropTarget(null); }}
              >
                Annuler
              </button>
              <span className="ap-crop-title">Recadrer la photo</span>
              <button
                className="ap-crop-ok"
                onClick={handleCropDone}
                disabled={!crop?.width || !crop?.height || isLoading}
              >
                {isLoading
                  ? <div className="ap-btn-spinner ap-btn-spinner--dark" />
                  : 'Valider'
                }
              </button>
            </div>
            <div className="ap-crop-body">
              {imageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCrop(c)}
                  minWidth={50}
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Recadrer"
                    onLoad={e => onImageLoaded(e.currentTarget)}
                    style={{ maxHeight: '65vh', maxWidth: '100%', display: 'block' }}
                  />
                </ReactCrop>
              )}
            </div>
            <p className="ap-crop-hint">
              Faites glisser pour ajuster la zone de recadrage
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
