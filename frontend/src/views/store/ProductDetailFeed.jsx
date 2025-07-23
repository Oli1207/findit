import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import Review from "./Review";
import Swal from "sweetalert2";
import UserData from "../plugin/UserData";
import GetCurrentAddress from "../plugin/UserCountry";
import "./productdetailfeed.css";
import { useSwipeable } from 'react-swipeable';
import ReloadPrompt from "../../Prompt";


const ProductDetailFeed = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [gallery, setGallery] = useState([]);
  
    const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [profileData, setProfileData] = useState(null);
   const [colorValue, setColorValue] = useState("No Color");
   const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const navigate = useNavigate();
  const axios = apiInstance;
  const userData = UserData();
  const currentAddress = GetCurrentAddress();
   const [useProfileAddress, setUseProfileAddress] = useState(true);
    
    const [customAddress, setCustomAddress] = useState({
      mobile: "",
      address: "",
      city: "",
      state: "",
      // country: currentAddress.country,
    });
  
    const [orderProduct, setOrderProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`products/${slug}/`);
        setProduct(res.data);
        setGallery([res.data.image, ...res.data.gallery.map(g => g.image)]);
      } catch (error) {
        Swal.fire("Erreur", "Produit introuvable", "error");
        navigate("/");
      }
    };
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`user/profile/${userData?.user_id}/`);
        setProfileData(res.data);
      } catch (err) {}
    };
    fetchProduct();
    fetchProfile();
  }, [slug, userData?.user_id, navigate]);

  const selectedImage = gallery[selectedIndex];

  const handleCopyLink = () => {
    const url = `${window.location.origin}/detail/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      Swal.fire({
        toast: true,
        position: "bottom",
        icon: "success",
        title: "Lien copié",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  };

  const handlePlaceOrder = async (product_id, price, vendor_id) => {
    const formData = new FormData();
    formData.append("product_id", product_id);
    formData.append("user_id", userData?.user_id);
    formData.append("qty", qtyValue);
    formData.append("price", price);
    formData.append("vendor", vendor_id);
    formData.append("size", sizeValue);
    formData.append("color", colorValue);
    formData.append("full_name", userData?.full_name);

    if (
      useProfileAddress &&
      profileData?.mobile &&
      profileData?.address &&
      profileData?.city
    ) {
      // On utilise le profil existant
      formData.append("mobile", profileData.mobile);
      formData.append("address", profileData.address);
      formData.append("city", profileData.city);
      formData.append("state", profileData.state);
      formData.append("country", profileData.country);
    } else {
      // Sinon on prend les valeurs du formulaire
      formData.append("mobile", customAddress.mobile);
      formData.append("address", customAddress.address);
      formData.append("city", customAddress.city);

      // On met à jour le profil en même temps
      const profileForm = new FormData();
      profileForm.append("mobile", customAddress.mobile);
      profileForm.append("address", customAddress.address);
      profileForm.append("city", customAddress.city);

      await axios.patch(`user/profile/${userData?.user_id}/`, profileForm);
    }

    try {
      console.log(formData.values);
      const response = await axios.post(`create-order/`, formData);
      Swal.fire({
        icon: "success",
        title: "Commande passée avec succès !",
        text: response.data.message,
      });
      setOrderProduct(null);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Échec commande",
        text: error.response?.data?.message || "Erreur réseau",
      });
    }
  };

  const addToWishList = async () => {
    const formdata = new FormData();
    formdata.append("product_id", product.id);
    formdata.append("user_id", userData?.user_id);

    const response = await axios.post(
      `customer/wishlist/${userData?.user_id}/`,
      formdata
    );
    Swal.fire({
      icon: "success",
      title: response.data.message,
    });
  };

  // 👇 NE PAS le mettre après `if (!product)`
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => setSelectedIndex((prev) => Math.min(prev + 1, gallery.length - 1)),
  onSwipedRight: () => setSelectedIndex((prev) => Math.max(prev - 1, 0)),
  trackMouse: true
});

if (!product) return <div className="loader">Chargement…</div>;


   const handleReviewIconClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
  };
  
    const handleQtyChange = (event) => {
    setQtyValue(event.target.value);
  };

// ⬆️ Juste avant le return, dans le composant

  return (
    <div className="instagram-feed">
      {/* Header */}
      <div className="ig-header">
        <button onClick={() => navigate(-1)} className="back-btn">←</button>
        <h2>{product.vendor?.name || "Vendor"}</h2>
      </div>

      {/* Galerie principale */}
  <div className="ig-gallery">
  <div
    {...swipeHandlers}
    className="ig-slide-container"
    style={{ transform: `translateX(-${selectedIndex * 100}%)` }}
  >
    {gallery.map((img, i) => (
      <img key={i} src={img} className="ig-slide-image" alt={product.title} />
    ))}
  </div>
  <div className="ig-dots">
    {gallery.map((_, i) => (
      <span
        key={i}
        className={`ig-dot ${selectedIndex === i ? "active" : ""}`}
        onClick={() => setSelectedIndex(i)}
      />
    ))}
  </div>
</div>



      {/* Infos produit */}
      <div className="ig-info">
        <div className="ig-meta">
          <h3>{product.title}</h3>
          <p className="price">{product.price} FCFA</p>
          
        </div>

        <p className="description">{product.description}</p>
         <div className="ig-actions">
              <div className="action-btn">
                <i className="fas fa-star" />{" "}
                <span>
                  {product.rating ? product.rating.toFixed(1) : "0.0"}
                </span>
              </div>
              <div
                className="action-btn"
                onClick={() => handleReviewIconClick(product)}
              >
                <i className="fas fa-comment-dots"></i>{" "}
                <span>{product.rating_count || 0}</span>
              </div>
              {/* <div
                className="action-btn"
                onClick={() => handleOrderClick(product)}
              >
                <i className="fas fa-shopping-cart"></i>
              </div> */}
              <div
                className="action-btn"
                onClick={() => handleCopyLink(product)}
              >
                <i className="fas fa-link"></i>
              </div>
            </div>
{/* 
        {product.color?.length > 0 && (
          <div className="ig-select">
            <label>Couleur</label>
            <select onChange={e => setColorValue(e.target.value)}>
              <option>Couleur</option>
              {product.color.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {product.size?.length > 0 && (
          <div className="ig-select">
            <label>Taille</label>
            <select onChange={e => setSizeValue(e.target.value)}>
              <option>Taille</option>
              {product.size.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ig-qty">
          <input
            type="number"
            min={1}
            value={qtyValue}
            onChange={e => setQtyValue(e.target.value)}
          />
        </div>

        <button className="ig-buy-btn" onClick={handlePlaceOrder}>
          Commander
        </button> */}

             <>
          
            <div className="mb-3">
              <label>
                <b>Quantité :</b>
              </label>
              <input
                type="number"
                className="form-control"
                value={qtyValue}
                min="1"
                onChange={handleQtyChange}
              />
            </div>
            {orderProduct?.size?.length > 0 && (
              <div className="mb-3">
                <label>
                  <b>Taille :</b>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {orderProduct?.size?.map((size, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleSizeButtonClick(orderProduct.id, size.name)
                      }
                      className="btn btn-outline-primary btn-sm"
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {orderProduct?.color?.length > 0 && (
              <div className="mb-3">
                <label>
                  <b>Couleur :</b>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {orderProduct?.color?.map((color, index) => (
                    <button
                      key={index}
                      className="btn btn-sm p-3"
                      style={{ backgroundColor: `${color.color_code}` }}
                      onClick={() =>
                        handleColorButtonClick(orderProduct.id, color.name)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Utiliser mon adresse */}
            {profileData?.mobile &&
            profileData?.address &&
            profileData?.city ? (
              <div className="form-check my-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="useProfileAddress"
                  checked={useProfileAddress}
                  onChange={(e) => setUseProfileAddress(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="useProfileAddress">
                  Utiliser mon adresse enregistrée
                </label>
              </div>
            ) : null}
            {/* /* Si décoché ou adresse inexistante → champs personnalisés  */}
            {(!useProfileAddress ||
              !profileData?.mobile ||
              !profileData?.address ||
              !profileData?.city) && (
              <div>
                <div className="mb-2">
                  <label>Téléphone</label>
                  <input
                    className="form-control"
                    value={customAddress.mobile}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        mobile: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
                <div className="mb-2">
                  <label>Adresse</label>
                  <input
                    className="form-control"
                    value={customAddress.address}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        address: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
                <div className="mb-2">
                  <label>Ville</label>
                  <input
                    className="form-control"
                    value={customAddress.city}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        city: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
              </div>
            )}
            {/* Boutons actions */}
            <button
              className="btn btn-primary w-100 my-2"
              onClick={() =>
                handlePlaceOrder(
                  product?.id,
                  product?.price,
                  product?.vendor?.id
                )
              }
            >
              <i className="fas fa-shopping-cart me-2" />
              Commander
            </button>
            <button
              className="btn btn-outline-danger w-100"
              onClick={() => addToWishList(product?.id)}
            >
              <i className="fas fa-heart me-2" />
              Ajouter en wishlist
            </button>
       </>
      
      </div>
<ReloadPrompt/>
      {/* Panel d’avis */}
      {/* {showReviews && (
        <div className="ig-overlay">
          <div className="ig-review-panel">
            <button className="close" onClick={() => setShowReviews(false)}>
              ×
            </button>
            <h5>Avis sur {product.title}</h5>
            <Review product={product} userData={userData} />
          </div>
        </div>
      )} */}

         {/* {selectedProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseReview}>
              &times;
            </button>
            <Review product={selectedProduct} userData={userData} />
          </div>
        </div>
      )} */}
    </div>
  );
};

export default ProductDetailFeed;
