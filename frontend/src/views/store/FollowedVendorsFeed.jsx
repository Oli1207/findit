import React, { useState, useEffect } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate } from "react-router-dom";
import GetCurrentAddress from "../plugin/UserCountry";
import UserData from "../plugin/UserData";
import { useMediaQuery } from "react-responsive";
import Swal from "sweetalert2";
import Review from "./Review";
import "./tiktokfeed.css";
// import star from 'etoile.png'

const FollowedVendorsFeed = () => {
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const axios = apiInstance;
  const userData = UserData();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const currentAddress = GetCurrentAddress();
  const navigate = useNavigate();
  const [orderProduct, setOrderProduct] = useState(null);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showSpecifications, setShowSpecifications] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [specificationStates, setSpecificationStates] = useState({});
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [customAddress, setCustomAddress] = useState({
    mobile: "",
    address: "",
    city: "",
    state: "",
    // country: currentAddress.country,
  });
  
    const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`user/profile/${userData?.user_id}/`); // Remplacez par l'URL complète si nécessaire
        setProfileData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfile();
  }, [userData?.user_id]);

  const handleOrderClick = (product) => {
    setOrderProduct(product);
  };

  const handleCloseOrder = () => {
    setOrderProduct(null);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsResponse = await axios.get(`products/followed/${userData?.user_id}/`);
        setProducts(productsResponse.data);
        console.log(productsResponse.data);
        
       

      } catch (error) {
        console.error("Erreur chargement produits :", error);
      }
    };

    fetchProducts();
  }, []);

    
  const handleFollowToggle = (userId, vendorId) => {
    if (!userId || !vendorId) {
      console.error("User ID or Vendor ID is missing");
      return;
    }
    // Créer une instance de FormData
    const formData = new FormData();
    formData.append('user_id', userId); // Ajouter l'ID de l'utilisateur
  
    // Envoyer une requête POST à l'API
    axios.post(`toggle-follow/${vendorId}/`, formData)
      .then(response => {
        if (response.data.success) {
          console.log(response.data);
          setFollowStates((prevState) => ({
            ...prevState,
            [vendorId]: response.data.following, // Met à jour l'état pour ce vendeur
          }));
          
        } else {
          console.error('Erreur:', response.data.error);
        }
      })
      .catch(error => {
        console.error('Error toggling follow:', error);
      });
  };

  const handleStartConversation = async (vendorId) => {
    const userId = userData?.user_id; // Exemple de récupération de l'ID utilisateur
    if (!userId) {
        alert("User ID is missing. Please log in.");
        return;
    }

    if (!vendorId) {
        alert("Vendor ID is missing.");
        return;
    }

    try {
        const response = await apiInstance.post('conversations/', { 
            user_id: userId,
            vendor_id: vendorId 
        });
        const conversation = response.data;
        console.log('Conversation started:', conversation);

        navigate(`/conversation/${conversation.id}`);
        console.log(conversation.id)
    } catch (error) {
        console.error('Error starting conversation:', error.response?.data || error.message);
        alert('Unable to start conversation. Please try again.');
    }
};

  const handleReviewIconClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
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

  const handleAddressChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value,
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
      console.log(formData.values)
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

  return (
    <div className="app-container">
      {/* Top navigation */}
      <div className="top-bar">
        <div className="tabs">
        <Link to="/haul" className="text-decoration-none text-white">
          <span>Haul</span>
          </Link>
          <span className="active">Suivis</span>
          <Link to="/" className="text-decoration-none text-white">
          <span >Accueil</span>
          </Link>
        </div>
        <div className="search-icon">
          <i class="fas fa-search"></i>
        </div>
      </div>

      {/* Feed */}
      <div className="feed-container">
        {products.map((product) => (
          <div className="feed-item" key={product.id}>
            <img
              src={product.image}
              alt={product.title}
              className="feed-image"
            />
            <div className="overlay"></div>
            <div className="info">
                   {product.vendor?.user !== userData?.user_id && (
                                <>
                                  <button onClick={() => handleStartConversation(product.vendor?.id)}>
                                    {product.vendor?.name}
                                  </button>
                                 
                                  <Link to={`/customer/${product.vendor?.slug}/`}style={{backgroundColor:'gray'}} className="btn ms-2" type="submit">
                                                                View Shop <i className="fas fa-shop" />{" "}
                                                              </Link>
                                </>
                              )}
                                {product.vendor?.user === userData?.user_id && (
                                                <>
                                                      {product.vendor?.name}
                                                        <Link to={`/vendor/${product.vendor?.slug}/`} style={{backgroundColor:'gray'}}  className="btn ms-2" type="submit">
                                                                                        View Shop <i className="fas fa-shop" />{" "}
                                                                                      </Link>
                                                </>
                                              )}
              <h2>{product.title}</h2>

              <p>{product.category?.title}</p>
              <div className="specifications mt-2">
                {product.specification && product.specification.length > 0 && (
                  <>
                    <button
                      className="btn btn-link text-white p-0"
                      onClick={() => toggleSpecification(product.id)}
                    >
                      <i className="fas fa-info-circle me-2"></i>
                      Spécifications
                    </button>

                    {specificationStates[product.id] && (
                      <div
                        className="text-white mt-2 small"
                        style={{ maxHeight: "200px", overflowY: "auto" }}
                      >
                        {product.specification
                          .slice(
                            0,
                            specificationStates[product.id]
                              ? product.specification.length
                              : 3
                          )
                          .map((spec, index) => (
                            <div key={index} className="mb-1">
                              <strong>{spec.title}:</strong> {spec.content}
                            </div>
                          ))}

                        {product.specification.length > 3 && (
                          <button
                            className="btn btn-sm btn-link text-white p-0"
                            onClick={() => toggleSpecification(product.id)}
                          >
                            {specificationStates[product.id]
                              ? "Voir moins"
                              : "Voir plus"}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="actions">
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
              <div
                className="action-btn"
                onClick={() => handleOrderClick(product)}
              >
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div
                className="action-btn"
                onClick={() => handleCopyLink(product)}
              >
                <i className="fas fa-link"></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="bottom-bar">
      <div className="nav-item">
  <Link to="/vendor/orders/" className="text-decoration-none text-white">
    <i className="fas fa-money-bill-wave"></i>
    <br />
    vendeur
  </Link>
</div>
        <div className="nav-item add-btn">
        <Link to="/add-product" className="text-decoration-none text-white">
          <i class="fas fa-plus"></i>
          </Link>
        </div>
        <div className="nav-item">
        <Link to="/customer/orders/" className="text-decoration-none text-white">
          <i class="fas fa-shopping-bag"></i>
          <br />
          Acheteur
          </Link>
        </div>
      </div>

      {/* Review overlay */}
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
    </div>
  );
};

export default FollowedVendorsFeed;
