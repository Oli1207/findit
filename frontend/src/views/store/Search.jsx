import React, { useState, useEffect } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GetCurrentAddress from "../plugin/UserCountry";
import UserData from "../plugin/UserData";
import CardID from "../plugin/CardID";
import Swal from "sweetalert2";
import informationIcon from "../../assets/information.png";
import { useMediaQuery } from "react-responsive";
import Review from "./Review";
import "./tiktokfeed.css";
import "./search.css"
import { useSwipeable } from "react-swipeable";
import { useFollowStore } from "../../store/useFollowStore";
import { syncOrdersIfOnline } from "./OrderQueue";
import BottomBar from "./BottomBar";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function Search() {
  const axios = apiInstance;
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [category, setCategory] = useState([]);
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [searchInput, setSearchInput] = useState("");

  const [orderProduct, setOrderProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCategoriesOnly, setShowCategoriesOnly] = useState(true);

  const [selectedIndex, setSelectedIndex] = useState({});
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [customAddress, setCustomAddress] = useState({
    mobile: "",
    address: "",
    city: "",
    state: "",
    // country: currentAddress.country,
  });
  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();
  const currentAddress = GetCurrentAddress();
  const userData = UserData();
  const cart_id = CardID();
  const navigate = useNavigate();
  const [specificationStates, setSpecificationStates] = useState({});

  const toggleSpecifications = (productId) => {
    setShowSpecifications((prev) => ({
      ...prev,
      [productId]: !prev[productId], // Toggle specification visibility for specific product
    }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiInstance.get(
          `user/profile/${userData?.user_id}/`
        ); // Remplacez par l'URL complète si nécessaire
        setProfileData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfile();
  }, [userData?.user_id]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    if (!searchInput || searchInput.trim() === "") {
      setShowCategoriesOnly(true);
    }
  }, []);

const handleCategoryClick = async (categoryId) => {
  setShowCategoriesOnly(false); // On passe en mode produits
  try {
    const { data } = await apiInstance.get(`category/${categoryId}/`);
    setProducts(data); // on alimente la feed-container avec les produits de cette catégorie
  } catch (error) {
    console.error("Erreur lors de la récupération des produits :", error);
  }
};

  const handleSearchSubmit = async (e) => {
  if (!searchInput || searchInput.trim() === "") {
    setShowCategoriesOnly(true);
    return; // si vide, on ne fait pas de recherche
  } else {
    setShowCategoriesOnly(false);
  }

    try {
      const response = await apiInstance.get(`search/?query=${searchInput}`);
      setProducts(response.data);
      const vendorIds = response.data
        .map((p) => p.vendor?.id)
        .filter((id) => id);
      fetchFollowStates(vendorIds, userData?.user_id);
    } catch (error) {
      console.error("Erreur lors de la recherche :", error);
    }
  };

  // useEffect(() => {
  //   apiInstance.get(`search/?query=${query}`).then((response) => {
  //     setProducts(response.data);
  //     console.log(response.data);
  //     const vendorIds = response.data
  //       .map((p) => p.vendor?.id)
  //       .filter((id) => id);
  //     fetchFollowStates(vendorIds, userData?.user_id);
  //   });
  // }, [query]);

  useEffect(() => {
    apiInstance.get("category/").then((response) => {
      setCategory(response.data);
    });
  }, []);

  const handleReviewIconClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
  };
  const handleOrderClick = (product) => {
    setOrderProduct(product);
  };

  const handleCloseOrder = () => {
    setOrderProduct(null);
  };

  const handleColorButtonClick = (product_id, colorName) => {
    setColorValue(colorName);
    setSelectedColors((prevSelectedColors) => ({
      ...prevSelectedColors,
      [product_id]: colorName,
    }));
  };

  const handleSizeButtonClick = (product_id, sizeName) => {
    setSizeValue(sizeName);
    setSelectedSize((prevSelectedSize) => ({
      ...prevSelectedSize,
      [product_id]: sizeName,
    }));
  };

  const handleQtyChange = (event) => {
    setQtyValue(event.target.value);
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

  const addToWishList = async (productId) => {
    const formdata = new FormData();
    formdata.append("product_id", productId);
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

  const toggleSpecification = (productId) => {
    setSpecificationStates((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleViewProduct = (product) => {
    window.open(product.url, "_blank");
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setSelectedIndex((prev) => ({
        ...prev,
        [item.id]: Math.min((prev[item.id] || 0) + 1, totalImages - 1),
      }));
    },
    onSwipedRight: () => {
      setSelectedIndex((prev) => ({
        ...prev,
        [item.id]: Math.max((prev[item.id] || 0) - 1, 0),
      }));
    },
    trackMouse: true,
  });
  const handleCopyLink = (product) => {
    const url = `${window.location.origin}/detail/${product.slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        Swal.fire({
          toast: true,
          position: "bottom",
          icon: "success",
          title: "Lien copié dans le presse-papier",
          showConfirmButton: false,
          timer: 2000,
        });
      })
      .catch((err) => {
        console.error("Erreur copie lien :", err);
      });
  };
  useEffect(() => {
    const syncOnReconnect = () => {
      if (navigator.onLine) {
        syncOrdersIfOnline();
      }
    };

    window.addEventListener("online", syncOnReconnect);
    syncOnReconnect(); // tentative immédiate si connecté

    return () => {
      window.removeEventListener("online", syncOnReconnect);
    };
  }, []);
  return (
    <div className="app-container">
     <div className="top-bar-search">
  <form
    className="search-form-search"
    onSubmit={(e) => {
      e.preventDefault();
      handleSearchSubmit();
    }}
  >
    <input
      className="form-control"
      type="text"
      placeholder="chemise, jean..."
      value={searchInput}
      onChange={handleSearchChange}
    />
    <button type="submit" className="btn btn-outline-success">
      <i className="fas fa-search"></i>
    </button>
  </form>
</div>


      
        {showCategoriesOnly ? (
          <div className="feed-container"> 
          <div className="categories-fullscreen">
            {category?.map((c, index) => (
            
              <div
                key={index}
                className="category-card"
                onClick={() => handleCategoryClick(c.id)}
              >
                <img src={c.image} alt={c.title} />
                <h3>{c.title}</h3>
              
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="feed-container">
            {products.map((item, index) => (
              <div
                className="feed-item"
                data-id={`${item.type}-${item.id}`}
                key={`${item.type}-${item.id}`}
              >
                {/* Si c'est un produit */}
                {item.type === "product" ? (
                  <>
                    <div className="feed-image">
                      <div
                        {...handlers}
                        className="feed-slider"
                        style={{
                          display: "flex",
                          transform: `translateX(-${
                            (selectedIndex[item.id] || 0) * 100
                          }%)`,
                          transition: "transform 0.3s ease",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        {[item.image, ...(item.gallery || [])].map(
                          (img, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={img}
                              className="feed-slide-image"
                              alt={item.title}
                              style={{
                                minWidth: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          )
                        )}
                      </div>

                      {/* Points de navigation */}
                      <div
                        className="feed-dots"
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          display: "flex",
                          gap: "5px",
                          zIndex: "10",
                        }}
                      >
                        {[item.image, ...(item.gallery || [])].map(
                          (_, imgIndex) => (
                            <span
                              key={imgIndex}
                              className={`feed-dot ${
                                (selectedIndex[item.id] || 0) === imgIndex
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                setSelectedIndex((prev) => ({
                                  ...prev,
                                  [item.id]: imgIndex,
                                }))
                              }
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background:
                                  (selectedIndex[item.id] || 0) === imgIndex
                                    ? "white"
                                    : "rgba(255,255,255,0.5)",
                                cursor: "pointer",
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>

                    <div className="info">
                      <Link
                        to={
                          item.vendor?.user === userData?.user_id
                            ? `/vendor/${item.vendor?.slug}/`
                            : `/customer/${item.vendor?.slug}/`
                        }
                        style={{ fontWeight: "bold", fontSize: "15px" }}
                        className="ms-2"
                      >
                        {item.vendor?.name}
                      </Link>

                      <h2>
                        <Link to={`/detail/${item.slug}`}>{item.title}</Link>
                      </h2>
                      <p style={{ color: "white" }}>{item.description}</p>
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: "500",
                          color: "#DF468F",
                        }}
                      >
                        {item.price} frs
                      </p>
                      <p>{item?.category?.title}</p>

                      {/* Spécifications */}
                      <div className="specifications mt-2">
                        {item.specification &&
                          item.specification.length > 0 && (
                            <>
                              <p
                                onClick={() => toggleSpecification(item.id)}
                                style={{
                                  cursor: "pointer",
                                  color: "#ffffff",
                                  fontSize: "14px",
                                  margin: 0,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <i className="fas fa-info-circle me-2" />
                                Spécifications
                              </p>

                              {specificationStates[item.id] && (
                                <div
                                  className="text-white mt-2 small"
                                  style={{
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                  }}
                                >
                                  {item.specification
                                    .slice(0, 3)
                                    .map((spec, index) => (
                                      <div key={index} className="mb-1">
                                        <strong>{spec.title}:</strong>{" "}
                                        {spec.content}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </>
                          )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="actions">
                      <Link
                        to={
                          item.vendor?.user === userData?.user_id
                            ? `/vendor/${item.vendor?.slug}/`
                            : `/customer/${item.vendor?.slug}/`
                        }
                      >
                        <img
                          src={item.vendor?.image}
                          className="rounded-circle"
                          alt={item.vendor?.name}
                          style={{
                            height: "40px",
                            width: "50px",
                            objectFit: "cover",
                            margin: "10px",
                          }}
                        />
                      </Link>

                      {item.vendor?.user !== userData?.user_id && (
                        <span
                          onClick={() =>
                            toggleFollow(userData?.user_id, item.vendor?.id)
                          }
                          style={{
                            cursor: "pointer",
                            padding: "4px 10px",
                            borderRadius: "15px",
                            backgroundColor: followStates[item.vendor?.id]
                              ? "#e0e0e0"
                              : "#007bff",
                            color: followStates[item.vendor?.id]
                              ? "#333"
                              : "#fff",
                            fontSize: "12px",
                            fontWeight: 500,
                            marginLeft: "10px",
                          }}
                        >
                          {followStates[item.vendor?.id] ? (
                            ""
                          ) : (
                            <i className="fas fa-plus" />
                          )}
                        </span>
                      )}

                      <div className="action-btn">
                        <i className="fas fa-star" />
                        <span>
                          {item.rating ? item.rating.toFixed(1) : "0.0"}
                        </span>
                      </div>
                      <div
                        className="action-btn"
                        onClick={() => handleReviewIconClick(item)}
                      >
                        <i className="fas fa-comment-dots" />
                        <span>{item.rating_count || 0}</span>
                      </div>
                      <div
                        className="action-btn"
                        onClick={() => handleOrderClick(item)}
                      >
                        <i className="fas fa-shopping-cart" />
                      </div>
                      <div
                        className="action-btn"
                        onClick={() => handleCopyLink(item)}
                      >
                        <i className="fas fa-link" />
                      </div>
                    </div>
                  </>
                ) : (
                  // Si c’est une présentation vidéo
                  <div
                    className="feed-item"
                    data-id={`${item.type}-${item.id}`}
                    key={`${item.type}-${item.id}`}
                  >
                    <video
                      ref={(el) => setVideoRef(el, index)}
                      autoPlay
                      src={item.video}
                      className="feed-image"
                      muted
                      loop
                      playsInline
                      onClick={(e) => {
                        const video = e.target;
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />

                    <div className="overlay"></div>

                    <div className="info">
                      <h3
                        style={{
                          textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
                          color: "white",
                        }}
                      >
                        {item.vendor?.name}
                      </h3>
                      <h2
                        style={{
                          textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
                          color: "white",
                        }}
                      >
                        {item.title}
                      </h2>
                      <p
                        style={{
                          textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",
                          color: "white",
                        }}
                      >
                        {item.description}
                      </p>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer">
                          {item.link}
                        </a>
                      )}
                    </div>

                    <div className="actions">
                      <div
                        style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                        className="action-btn"
                        onClick={() => handleLike(item.id)}
                      >
                        <i className="fas fa-heart" /> {item.likes_count}
                      </div>
                      <div
                        style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                        className="action-btn"
                        onClick={() => handleCommentIconClick(item)}
                      >
                        <i className="fas fa-comment-dots"></i>{" "}
                        <span>{item.comments?.length || 0}</span>
                      </div>
                      <div
                        style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                        className="action-btn"
                        onClick={() => copyLink(item.id)}
                      >
                        <i className="fas fa-link" />
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            ))}

          </div>
        )}
      {!showCategoriesOnly && products < 1 && (
        <div className="feed-container">
        <h5 style={{marginTop:"30px", fontSize: "16px"}} className="p-3">Aucun produit trouvé</h5>
        </div>
      )}
      {selectedProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseReview}>
              &times;
            </button>
            <Review product={selectedProduct} userData={userData} />
          </div>
        </div>
      )}
      {orderProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseOrder}>
              &times;
            </button>
            <h4 className="mb-3">{orderProduct.title}</h4>
            {/* Variations */}
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
            {orderProduct.size?.length > 0 && (
              <div className="mb-3">
                <label>
                  <b>Taille :</b>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {orderProduct.size.map((size, index) => (
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
            {orderProduct.color?.length > 0 && (
              <div className="mb-3">
                <label>
                  <b>Couleur :</b>
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {orderProduct.color.map((color, index) => (
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
                  orderProduct.id,
                  orderProduct.price,
                  orderProduct.vendor?.id
                )
              }
            >
              <i className="fas fa-shopping-cart me-2" />
              Commander
            </button>
            <button
              className="btn btn-outline-danger w-100"
              onClick={() => addToWishList(orderProduct.id)}
            >
              <i className="fas fa-heart me-2" />
              Ajouter en wishlist
            </button>
          </div>
        </div>
      )}
      {/* <div
        className="bottom-bar"
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          height: "100px",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          overflowX: "auto",
          padding: "10px 15px",
          gap: "20px",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {category?.map((c, index) => (
          <div
            key={index}
            style={{
              flex: "0 0 auto",
              textAlign: "center",
              color: "white",
              marginBottom: "60px",
            }}
          >
            <Link
              to={`/category/${c.id}`} // ou autre route logique
              className="text-decoration-none text-white"
            >
              <img
                src={c.image}
                alt={c.title}
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginBottom: "5px",
                }}
              />
              <h6 style={{ fontSize: "12px", color: "white" }}>{c.title}</h6>
            </Link>
          </div>
        ))}
      </div> */}

      <BottomBar />
    </div>
  );
}

export default Search;
