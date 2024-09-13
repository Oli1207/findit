import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import CardID from '../plugin/CardID';
import UserData from '../plugin/UserData';
import GetCurrentAddress from '../plugin/UserCountry';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function Cart() {
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState([]);
  const [productQuantities, setProductQuantities] = useState('');
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  const userData = UserData();
  const cart_id = CardID();
  const currentAddress = GetCurrentAddress();

  const fetchCartData = (cartId, userId) => {
    const url = userId ? `cart-list/${cartId}/${userId}/` : `cart-list/${cartId}/`;
    apiInstance.get(url).then((res) => {
      setCart(res.data);
    });
  };

  const fetchCartTotal = (cartId, userId) => {
    const url = userId ? `cart-detail/${cartId}/${userId}/` : `cart-detail/${cartId}/`;
    apiInstance.get(url).then((res) => {
      setCartTotal(res.data);
    });
  };

  useEffect(() => {
    if (cart_id !== null && cart_id !== undefined) {
      if (userData !== undefined) {
        fetchCartData(cart_id, userData?.user_id);
        fetchCartTotal(cart_id, userData?.user_id);
      } else {
        fetchCartData(cart_id, null);
        fetchCartTotal(cart_id, null);
      }
    }
  }, [cart_id, userData]);

  useEffect(() => {
    const initialQuantities = {};
    cart.forEach((c) => {
      initialQuantities[c.product?.id] = c.qty;
    });
    setProductQuantities(initialQuantities);
  }, [cart]);

  const handleQtyChange = (event, product_id) => {
    const quantity = event.target.value;
    setProductQuantities((prevQuantities) => ({
      ...prevQuantities,
      [product_id]: quantity,
    }));
  };

  const updateCart = async (product_id, price, shipping_amount, size, color) => {
    const qtyValue = productQuantities[product_id];

    const formData = new FormData();
    formData.append("product_id", product_id);
    formData.append("user_id", userData?.user_id);
    formData.append("qty", qtyValue);
    formData.append("price", price);
    formData.append("shipping_amount", shipping_amount);
    formData.append("country", currentAddress.country);
    formData.append("size", size);
    formData.append("color", color);
    formData.append("cart_id", cart_id);

    const response = await apiInstance.post('cart-view/', formData);

    fetchCartData(cart_id, userData?.user_id);
    fetchCartTotal(cart_id, userData?.user_id);

    Toast.fire({
      icon: 'success',
      title: response.data.message,
    });
  };

  const handleDeleteCartItem = async (itemId) => {
    const url = userData?.user_id
      ? `cart-delete/${cart_id}/${itemId}/${userData?.user_id}/`
      : `cart-delete/${cart_id}/${itemId}/`;

    try {
      await apiInstance.delete(url);
      fetchCartData(cart_id, userData?.user_id);
      fetchCartTotal(cart_id, userData?.user_id);

      Toast.fire({
        icon: 'success',
        title: 'Item removed from cart',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    switch (name) {
      case 'fullName':
        setFullName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'mobile':
        setMobile(value);
        break;
      case 'address':
        setAddress(value);
        break;
      case 'city':
        setCity(value);
        break;
      case 'state':
        setState(value);
        break;
      case 'country':
        setCountry(value);
        break;
      default:
        break;
    }
  };

  const createOrder = async () => {
    if (!fullName || !email || !mobile || !address || !city || !state || !country) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields!',
        text: 'All fields are required before checkout!',
      });
    } else {
      try {
        const formdata = new FormData();
        formdata.append('full_name', fullName);
        formdata.append("email", email);
        formdata.append("mobile", mobile);
        formdata.append("address", address);
        formdata.append("city", city);
        formdata.append("state", state);
        formdata.append("country", country);
        formdata.append("cart_id", cart_id);
        formdata.append("user_id", userData ? userData?.user_id : 0);

        const response = await apiInstance.post('create-order/', formdata);
        navigate(`/checkout/${response.data.order_oid}/`);
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <main className="mt-5">
      <div className="container">
        <main className="mb-6">
          <div className="container">
            <section>
              <div className="row gx-lg-5 mb-5">
                <div className="col-lg-8 mb-4 mb-md-0">
                  <section className="mb-5">
                    {cart.map((c, index) => (
                      <div className="row border-bottom mb-4" key={index}>
                        <div className="col-md-2 mb-4 mb-md-0">
                          <div className="bg-image ripple rounded-5 mb-4 overflow-hidden d-block" data-ripple-color="light">
                            <Link to={`/detail/${c?.product?.slug}`}>
                              <img
                                src={c?.product?.image}
                                className="w-100"
                                alt=""
                                style={{ height: "100px", objectFit: "cover", borderRadius: "10px" }}
                              />
                            </Link>
                          </div>
                        </div>
                        <div className="col-md-8 mb-4 mb-md-0">
                          <Link to={`/detail/${c.product.slug}`} className="fw-bold text-dark mb-4">{c?.product?.title.slice(0, 20)}...</Link>
                          {c.size !== "No Size" && (
                            <p className="mb-0">
                              <span className="text-muted me-2">Taille:</span>
                              <span>{c.size}</span>
                            </p>
                          )}
                          {c.color !== "No Color" && (
                            <p className='mb-0'>
                              <span className="text-muted me-2">Couleur:</span>
                              <span>{c.color}</span>
                            </p>
                          )}
                          <p className='mb-0'>
                            <span className="text-muted me-2">Prix:</span>
                            <span>${c.product.price}</span>
                          </p>
                          <p className='mb-0'>
                            <span className="text-muted me-2">Stock:</span>
                            <span>{c.product.stock_qty}</span>
                          </p>
                          <p className='mb-0'>
                            <span className="text-muted me-2">Vendeur:</span>
                            <span>{c.product.vendor.name}</span>
                          </p>
                          <p className="mt-3">
                            <button onClick={() => handleDeleteCartItem(c.id)} className="btn btn-danger">
                              <small><i className="fas fa-trash me-2" />Supprimer</small>
                            </button>
                          </p>
                        </div>
                        <div className="col-md-2 mb-4 mb-md-0">
                          <div className="d-flex justify-content-center align-items-center">
                            <div className="form-outline d-flex">
                              <input
                                type="number"
                                id='typeNumber'
                                value={productQuantities[c.product?.id] || c.qty}
                                className="form-control"
                                min={1}
                                onChange={(e) => handleQtyChange(e, c.product.id)}
                              />
                              <button onClick={() => updateCart(c.product.id, c.product.price, c.product.shipping_amount, c.color, c.size)} className='ms-2 btn btn-primary'><i className='fas fa-rotate-right'></i></button>
                            </div>
                          </div>
                          <h5 className="mb-2 mt-3 text-center"><span className="align-middle">{c.sub_total} frs</span></h5>
                        </div>
                      </div>
                    ))}

                    {cart.length < 1 && (
                      <>
                        <h5>Votre panier est vide</h5>
                        <Link to='/'> <i className='fas fa-shopping-cart'></i> Continue Shopping</Link>
                      </>
                    )}
                  </section>

                  {cart.length > 0 && (
                    <form>
                      <h5 className="mb-4 mt-4">Informations personnelles</h5>
                      <div className="row mb-4">
                        <div className="col-lg-12">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="full_name"> <i className='fas fa-user'></i> Noms et prénoms</label>
                            <input
                              type="text"
                              id="full_name"
                              name='fullName'
                              className="form-control"
                              onChange={handleChange}
                              value={fullName}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="row mb-4">
                        <div className="col">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="email"><i className='fas fa-envelope'></i> Email</label>
                            <input
                              type="text"
                              id="email"
                              className="form-control"
                              name='email'
                              onChange={handleChange}
                              value={email}
                            />
                          </div>
                        </div>
                        <div className="col">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="mobile"><i className='fas fa-phone'></i> Numéro</label>
                            <input
                              type="text"
                              id="mobile"
                              className="form-control"
                              name='mobile'
                              onChange={handleChange}
                              value={mobile}
                            />
                          </div>
                        </div>
                      </div>

                      <h5 className="mb-1 mt-4">Shipping address</h5>

                      <div className="row mb-4">
                        <div className="col-lg-6 mt-3">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="address"> Adresse</label>
                            <input
                              type="text"
                              id="address"
                              className="form-control"
                              name='address'
                              onChange={handleChange}
                              value={address}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6 mt-3">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="city"> Ville</label>
                            <input
                              type="text"
                              id="city"
                              className="form-control"
                              name='city'
                              onChange={handleChange}
                              value={city}
                            />
                          </div>
                        </div>

                        <div className="col-lg-6 mt-3">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="state"> State</label>
                  
                            <input
                              type="text"
                              id="state"
                              className="form-control"
                              name='state'
                              onChange={handleChange}
                              value={state}
                            />
                             <small className='text-warning' > si vous êtes hors du Nigéria mettez juste votre ville</small>
                          </div>
                        </div>
                        <div className="col-lg-6 mt-3">
                          <div className="form-outline">
                            <label className="form-label" htmlFor="country"> Pays</label>
                            <input
                              type="text"
                              id="country"
                              className="form-control"
                              name='country'
                              onChange={handleChange}
                              value={country}
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="col-lg-4 mb-4 mb-md-0">
                    <section className="shadow-4 p-4 rounded-5 mb-4">
                      <h5 className="mb-3">Résumé du panier</h5>
                      <div className="d-flex justify-content-between mb-3">
                        <span>sous-total </span>
                        <span>{cartTotal.sub_total?.toFixed(2)} frs</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Livraison </span>
                        <span>{cartTotal.shipping?.toFixed(2)} frs</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Taxe </span>
                        <span>{cartTotal.tax?.toFixed(2)} frs</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Frais de service </span>
                        <span>{cartTotal.service_fee?.toFixed(2)} frs</span>
                      </div>
                      <hr className="my-4" />
                      <div className="d-flex justify-content-between fw-bold mb-5">
                        <span>Total </span>
                        <span>{cartTotal.total?.toFixed(2)} frs</span>
                      </div>
                    
                      <button
                        type='button'
                        className="btn btn-primary btn-rounded w-100"
                        onClick={createOrder}
                      >
                        Go to checkout
                      </button>
                    </section>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  );
}

export default Cart;
