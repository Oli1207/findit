import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import Swal from "sweetalert2";
import GetCurrentAddress from "../plugin/UserCountry";
import { useMediaQuery } from "react-responsive";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function Shop() {
  const userData = UserData();
  const [vendor, setVendor] = useState([]);
  const [products, setProducts] = useState([]);
  const param = useParams();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showSpecifications, setShowSpecifications] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [followStates, setFollowStates] = useState({});
  const isMobile = useMediaQuery({ maxWidth: 768 });

  useEffect(() => {
    apiInstance.get(`shop/${param.slug}/`).then((res) => {
      setVendor(res.data);
    });
  }, []);

  useEffect(() => {
    apiInstance.get(`vendor/products/${param.slug}/`).then((res) => {
      setProducts(res.data);
    });
  }, []);

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
    formData.append("mobile", profileData?.phone);
    formData.append("address", profileData?.address);
    formData.append("city", profileData?.city);
    formData.append("state", profileData?.state);
    formData.append("country", currentAddress.country);

    try {
      const response = await axios.post(`create-order/`, formData);
      console.log(userData);
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

  const handleFollowToggle = (userId, vendorId) => {
    if (!userId || !vendorId) {
      console.error("User ID or Vendor ID is missing");
      return;
    }
    // Créer une instance de FormData
    const formData = new FormData();
    formData.append("user_id", userId); // Ajouter l'ID de l'utilisateur

    // Envoyer une requête POST à l'API
    axios
      .post(`toggle-follow/${vendorId}/`, formData)
      .then((response) => {
        if (response.data.success) {
          console.log(response.data);
          setFollowStates((prevState) => ({
            ...prevState,
            [vendorId]: response.data.following, // Met à jour l'état pour ce vendeur
          }));
        } else {
          console.error("Erreur:", response.data.error);
        }
      })
      .catch((error) => {
        console.error("Error toggling follow:", error);
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
      const response = await apiInstance.post("conversations/", {
        user_id: userId,
        vendor_id: vendorId,
      });
      const conversation = response.data;
      console.log("Conversation started:", conversation);

      navigate(`conversation/${conversation.id}`);
      console.log(conversation.id);
    } catch (error) {
      console.error(
        "Error starting conversation:",
        error.response?.data || error.message
      );
      alert("Unable to start conversation. Please try again.");
    }
  };

  return (
    <main className="mt-5">
      <div className="container">
        <section className="text-center container">
          <div className="row py-lg-5">
            <div className="col-lg-6 col-md-8 mx-auto">
              <img
                src={vendor.image}
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                alt=""
              />
              <h1 className="fw-light">{vendor.name} couc</h1>{" "}
              
              <p className="lead text-muted">{vendor.description}</p>
            </div>
          </div>
        </section>
        <section className="text-center">
          <h4 className="mb-4"> {products.length} Product(s) </h4>
          <div className="row">
            {/* Run the .map() function here */}
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
                      style={{
                        height: "40px",
                        width: "50px",
                        objectFit: "cover",
                        marginTop: "10px",
                        marginRight: "10px",
                        marginBottom: "10px",
                        marginLeft: "10px",
                      }}
                      rounded
                    />
                    <small style={{ color: "#DF468F" }}>
                      {product.vendor?.user !== userData?.user_id && (
                        <>
                          <button
                            onClick={() =>
                              handleStartConversation(product.vendor?.id)
                            }
                          >
                            {product.vendor?.name} *
                          </button>
                          <button
                            onClick={() =>
                              handleFollowToggle(
                                userData?.user_id,
                                product.vendor?.id
                              )
                            }
                          >
                            {followStates[product.vendor?.id]
                              ? "Arrêter de suivre"
                              : "S’abonner"}
                          </button>
                        </>
                      )}
                      {product.vendor?.user === userData?.user_id && (
                        <>{product.vendor?.name}</>
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
                          style={{ backgroundColor: "#DF468F", color: "white" }}
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
                                      handleSizeButtonClick(
                                        product.id,
                                        size.name
                                      )
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
                                      handleColorButtonClick(
                                        product.id,
                                        color.name
                                      )
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
                          style={{ backgroundColor: "#DF468F", color: "white" }}
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
                        style={{ backgroundColor: "#DF468F", color: "white" }}
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
            {/* .map() function end here */}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Shop;
