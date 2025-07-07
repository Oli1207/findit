import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import Review from "./Review";
import Swal from "sweetalert2";
import UserData from "../plugin/UserData";
import GetCurrentAddress from "../plugin/UserCountry";
import "./tiktokfeed.css";

const ProductDetailFeed = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [showReviews, setShowReviews] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [specificationStates, setSpecificationStates] = useState({});
  const navigate = useNavigate();
  const axios = apiInstance;
  const userData = UserData();
  const currentAddress = GetCurrentAddress();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`products/${slug}/`);
        setProduct(res.data);
        setGallery(res.data.gallery);
        setSelectedImage(res.data.image);
      } catch (error) {
        console.error("Erreur chargement produit :", error);
        Swal.fire("Erreur", "Produit introuvable", "error");
        navigate("/");
      }
    };

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`user/profile/${userData?.user_id}/`);
        setProfileData(res.data);
      } catch (err) {
        console.error("Erreur chargement profil :", err);
      }
    };

    fetchProduct();
    fetchProfile();
  }, [slug, navigate, userData?.user_id]);

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

  const toggleSpecification = (productId) => {
    setSpecificationStates((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handlePlaceOrder = async () => {
    const formData = new FormData();
    formData.append("product_id", product.id);
    formData.append("user_id", userData?.user_id);
    formData.append("qty", qtyValue);
    formData.append("price", product.price);
    formData.append("vendor", product.vendor?.id);
    formData.append("size", sizeValue);
    formData.append("color", colorValue);
    formData.append("full_name", userData?.full_name);
    formData.append("mobile", profileData?.phone);
    formData.append("address", profileData?.address);
    formData.append("city", profileData?.city);
    formData.append("state", profileData?.state);
    formData.append("country", currentAddress.country);

    try {
      const response = await axios.post(`create-order/`, formData);
      Swal.fire({
        icon: "success",
        title: "Commande passée avec succès",
        text: response.data.message,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Erreur commande",
        text: error.response?.data?.message || "Problème inattendu",
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

  if (!product) return <div className="text-center mt-5">Chargement...</div>;

  return (
    <div className="app-container">
      {/* Produit */}
      <div className="feed-item">
        <img src={selectedImage} alt={product.title} className="feed-image" />
        <div className="overlay"></div>

        {/* Infos produit */}
        <div className="info">
          <h2>{product.title}</h2>
          <h4>{product.price} FCFA</h4>
          <p>{product.description}</p>

          {/* Mini galerie */}
          <div className="d-flex flex-wrap mt-2">
            {[product.image, ...gallery.map((g) => g.image)].map((img, index) => (
              <div className="p-1" style={{ cursor: "pointer" }} key={index}>
                <img
                  src={img}
                  onClick={() => setSelectedImage(img)}
                  style={{
                    width: 70,
                    height: 70,
                    objectFit: "cover",
                    borderRadius: 5,
                    border: selectedImage === img ? "2px solid #DF468F" : "1px solid #ddd"
                  }}
                  alt={`img-${index}`}
                />
              </div>
            ))}
          </div>

          {/* Couleurs */}
          {product.color?.length > 0 && (
            <>
              <h6 className="mt-2">Couleur : {colorValue}</h6>
              <div className="d-flex flex-wrap">
                {product.color.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setColorValue(color.name)}
                    className="btn p-2 m-1"
                    style={{
                      backgroundColor: color.color_code,
                      border:
                        colorValue === color.name ? "2px solid #DF468F" : "1px solid #ddd"
                    }}
                  ></button>
                ))}
              </div>
            </>
          )}

          {/* Tailles */}
          {product.size?.length > 0 && (
            <>
              <h6 className="mt-2">Taille : {sizeValue}</h6>
              <div className="d-flex flex-wrap">
                {product.size.map((size, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSizeValue(size.name)}
                    className={`btn btn-sm m-1 ${
                      sizeValue === size.name ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Quantité */}
          <div className="mt-2">
            <label>Quantité :</label>
            <input
              type="number"
              min={1}
              value={qtyValue}
              onChange={(e) => setQtyValue(e.target.value)}
              className="form-control w-50"
            />
          </div>

          {/* Spécifications */}
          {product.specification?.length > 0 && (
            <>
              <h5 className="mt-3">Détails :</h5>
              {product.specification.map((spec, idx) => (
                <div key={idx}>
                  <strong>{spec.title}:</strong> {spec.content}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="actions">
          <div className="action-btn">
            ❤️ {product.product_rating ? product.product_rating.toFixed(1) : "0.0"}
          </div>
          <div className="action-btn" onClick={() => setShowReviews(true)}>
            💬
          </div>
          <div className="action-btn" onClick={handleCopyLink}>
            🔗
          </div>
        </div>
      </div>

      {/* Bouton Acheter */}
      <div className="bottom-bar d-flex">
        <button
          className="btn w-50"
          style={{ backgroundColor: "#DF468F", color: "white" }}
          onClick={handlePlaceOrder}
        >
          Commander
        </button>
        <button className="btn btn-outline-light w-50" onClick={addToWishList}>
          ❤️ Wishlist
        </button>
      </div>

      {/* Reviews */}
      {showReviews && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={() => setShowReviews(false)}>
              &times;
            </button>
            <h5 className="mb-3">Avis sur {product.title}</h5>
            <Review product={product} userData={userData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailFeed;
