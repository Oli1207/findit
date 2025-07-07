import React, { useState, useEffect } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate } from "react-router-dom";
import GetCurrentAddress from "../plugin/UserCountry";
import UserData from "../plugin/UserData";
import Swal from "sweetalert2";
import { useMediaQuery } from "react-responsive";
import Review from "./Review";


const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function Products() {
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showSpecifications, setShowSpecifications] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [followStates, setFollowStates] = useState({});

  const axios = apiInstance
  const userData = UserData();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const currentAddress = GetCurrentAddress();
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`user/profile/${userData?.user_id}/`); // Remplacez par l'URL complète si nécessaire
        setProfileData(response.data);
        console.log(response.data)
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } 
    };

    fetchProfile();
  }, [userData?.user_id]);

  const [address, setAddress] = useState({
    full_name:  "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    country: GetCurrentAddress().country || "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les produits
        const productsResponse = await axios.get("products/");
        const productsData = productsResponse.data;
        setProducts(productsData);

        axios.get("category/").then((response) => {
          setCategory(response.data);
        });

        // Initialiser les états de suivi
        const initialFollowStates = {};
        for (const product of productsData) {
          const vendorId = product.vendor?.id;
          if (vendorId) {
            const followResponse = await axios.get(
              `vendors/${vendorId}/is-following/${userData?.user_id}/`
            );
            initialFollowStates[vendorId] = followResponse.data.following;
          }
        }
        console.log(initialFollowStates)
        setFollowStates(initialFollowStates);
      } catch (error) {
        console.error("Erreur lors du chargement des produits et des états de suivi :", error);
      }
    };

    fetchData();
  }, []);

 

  const handleReviewIconClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
  };

  const toggleSpecifications = (productId) => {
    setShowSpecifications((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
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
    formData.append("mobile", profileData?.phone);
    formData.append("address", profileData?.address);
    formData.append("city", profileData?.city);
    formData.append("state", profileData?.state);
    formData.append("country", currentAddress.country);

    try {
      const response = await axios.post(`create-order/`, formData);
      console.log(userData)
      Swal.fire({
        icon: "success",
        title: "Order placed successfully!",
        text: response.data.message,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to place order",
        text: error.response?.data?.message || "Something went wrong",
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

  // useEffect(() => {
  //   // Récupérer l'ID de l'utilisateur connecté depuis une source centralisée
  //   const fetchCurrentUser = async () => {
  //     try {
  //        // Exemple d'API pour récupérer l'utilisateur connecté
  //       c

  //       // Vérifier si cet utilisateur suit le vendeur
  //       const followResponse = await apiInstance.get(`vendors/${products.vendor.id}/${userData?.user_id}/`);
  //       setIsFollowing(followResponse.data.following);
  //     } catch (error) {
  //       console.error('Error fetching user or vendor data:', error);
  //     }
  //   };

  //   fetchCurrentUser();
  // }, [products.vendor?.id]);

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

        navigate(`conversation/${conversation.id}`);
        console.log(conversation.id)
    } catch (error) {
        console.error('Error starting conversation:', error.response?.data || error.message);
        alert('Unable to start conversation. Please try again.');
    }
};

 


  return (
    <>
      <main>
        <div  className="container">
          {/* Category List */}
          <div className="row mb-3">
            {category?.map((c, index) => (
              <div className="col-lg-2 col-md-3 col-sm-4 mb-2" key={index}>
                <button className="btn btn-outline-primary w-100">
                  {c.title}
                </button>
              </div>
            ))}
          </div>

          {/* Product List */}
          <div className="row g-3">
            {products?.map((product) => (
              <div className="col-lg-4 col-md-6 col-sm-12" key={product.id}>
                <div className="card shadow-sm h-100">
                  <div
                    className="bg-image hover-zoom ripple position-relative"
                    data-mdb-ripple-color="light"
                  >
                    
                       <img
                        src={product.vendor?.image}
                        className="rounded-circle"
                        alt={product.vendor?.name}
                        style={{ height: "40px",width:"50px", objectFit: "cover", marginTop:"10px", marginRight:"10px", marginBottom:"10px", marginLeft:"10px" }}
                        rounded
                      />
                 <small style={{color:'#DF468F'}}
                 >
                   {product.vendor?.user !== userData?.user_id && (
                  <>
                    <button onClick={() => handleStartConversation(product.vendor?.id)}>
                      {product.vendor?.name}
                    </button>
                    <button onClick={() => handleFollowToggle(userData?.user_id, product.vendor?.id)}>
                    {followStates[product.vendor?.id]
                            ? "Arrêter de suivre"
                            : "S’abonner"}
                    </button>
                    <Link to={`/customer/${product.vendor?.slug}/`} className="btn btn-primary ms-2" type="submit">
                                                  View Shop <i className="fas fa-shop" />{" "}
                                                </Link>
                  </>
                )}
                 
                {product.vendor?.user === userData?.user_id && (
                  <>
                        {product.vendor?.name}
                          <Link to={`/vendor/${product.vendor?.slug}/`} className="btn btn-primary ms-2" type="submit">
                                                          View Shop <i className="fas fa-shop" />{" "}
                                                        </Link>
                  </>
                )}


      </small> 
                    <Link to={`/detail/${product.slug}`}>
                      <img
                        src={product.image}
                        className="card-img-top"
                        alt={product.title}
                        style={{ height: "60vh", objectFit: "cover" }}
                      />
                    </Link>
                    {isMobile && (
                      <button
                        className="btn btn-secondary position-absolute top-2 end-2 rounded-circle"
                        onClick={() => handleReviewIconClick(product)}
                        style={{ background: "rgba(0, 0, 0, 0.6)" }}
                      >
                        <i className="fas fa-comment"></i>
                      </button>
                    )}
                  </div>

                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <Link to={`/detail/${product.slug}`}>
                        <h5 className="card-title">{product.title}</h5>
                      </Link>
                      <p className="text-muted small">
                        {product.category?.title}
                      </p>
                      <h6 className="text-primary">{product.price} frs</h6>
                    </div>

                    <div className="mt-3">
                      {/* Variations */}
                      <div className="btn-group w-100">
                        <button
                        style={{backgroundColor: '#DF468F', color:'white'}}
                          className="btn dropdown-toggle"
                          type="button"
                          id={`dropdownMenu${product.id}`}
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          <i className="fas fa-sliders-h me-2"></i>Variations
                        </button>
                        <ul
                          className="dropdown-menu p-3"
                          aria-labelledby={`dropdownMenu${product.id}`}
                        >
                          <div className="mb-2">
                            <label className="form-label">
                              <b>Quantité</b>
                            </label>
                            <input
                              className="form-control"
                              value={qtyValue}
                              onChange={handleQtyChange}
                              type="number"
                              min="1"
                            />
                          </div>
                          {product.size?.length > 0 && (
                            <div className="mb-2">
                              <label className="form-label">
                                <b>Taille</b>:{" "}
                                {selectedSize[product.id] || "No Size"}
                              </label>
                              <div className="d-flex flex-wrap gap-2">
                                {product.size.map((size, index) => (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      handleSizeButtonClick(product.id, size.name)
                                    }
                                    className="btn btn-outline-primary btn-sm"
                                  >
                                    {size.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {product.color?.length > 0 && (
                            <div className="mb-2">
                              <label className="form-label">
                                <b>Couleur</b>:{" "}
                                {selectedColors[product.id] || "No Color"}
                              </label>
                              <div className="d-flex flex-wrap gap-2">
                                {product.color.map((color, index) => (
                                  <button
                                    key={index}
                                    className="btn btn-sm p-3"
                                    style={{
                                      backgroundColor: `${color.color_code}`,
                                    }}
                                    onClick={() =>
                                      handleColorButtonClick(product.id, color.name)
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </ul>
                      </div>

                      {/* Place Order */}
                      <div className="mt-3">
                        <button
                         style={{backgroundColor: '#DF468F', color:'white'}}
                          className="btn w-100"
                          onClick={() =>
                            handlePlaceOrder(
                              product.id,
                              product.price,
                              product.vendor?.id
                            )
                          }
                        >
                          <i className="fas fa-shopping-cart me-2" />
                          Place Order
                        </button>
                      </div>

                      {/* Wishlist */}
                      <button
                       style={{backgroundColor: '#DF468F', color:'white'}}
                        className="btn mt-2 w-100"
                        onClick={() => addToWishList(product.id)}
                      >
                        <i className="fas fa-heart me-2" />
                        Add to Wishlist
                      </button>

                      {/* Specifications */}
                      <button
                        className="btn btn-link text-muted mt-2"
                        onClick={() => toggleSpecifications(product.id)}
                      >
                        <i className="fas fa-info-circle me-2" />
                        View Specifications
                      </button>
                      {showSpecifications[product.id] && (
                        <div className="mt-3 small">
                          {product.specification?.map((spec, index) => (
                            <div key={index} className="d-flex">
                              <strong className="me-2">{spec.title}:</strong>{" "}
                              {spec.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Overlay */}
        {isMobile && selectedProduct && (
          <div className="review-overlay">
            <div className="review-container">
              <button className="btn btn-close" onClick={handleCloseReview}>
                &times;
              </button>
              <Review product={selectedProduct} userData={userData} />
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .review-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .review-container {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          max-width: 90%;
          max-height: 80%;
          overflow-y: auto;
          position: relative;
        }
        .btn-close {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 1.5rem;
          background: none;
          border: none;
          color: #000;
        }
      `}</style>
    </>
  );
}

export default Products;