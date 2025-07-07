import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import moment from 'moment';
import './orderscustomer.css';

function Orders() {
  const [orders, setOrders] = useState([]);
  const axios = apiInstance;
  const userData = UserData();
  const navigate = useNavigate();

  useEffect(() => {
    apiInstance.get(`customer/orders/${userData?.user_id}`).then((res) => {
      setOrders(res.data);
    });
  }, [userData?.user_id]);

  const goToSettings = () => {
    navigate("/customer/account/");
  };
 const goToWishlist = () => {
    navigate("/customer/wishlist/");
  };
  const goToMessages = () => {
    navigate("/customer/messages/");
  };

  return (
    <div className="orders-page">

      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar-title">Mes commandes</div>
        <div className="top-bar-icons">
          <span onClick={goToMessages}><i class="fas fa-comment-alt"></i>
</span>
   <span onClick={goToWishlist}><i class="fas fa-heart"></i>
</span>
          <span onClick={goToSettings}><i class="fas fa-cog"></i>
</span>
        </div>
      </div>

      {/* Orders list */}
      <div className="orders-feed">
        {orders.length > 0 ? (
          orders.map((o, index) => (
            <div key={index} className="order-cardd">
              <h4>Commande #{o.oid}</h4>
              <img src={o?.product?.image} alt="product-img" className="order-product-image" />
              <div className="order-info">
                <p><strong>Date :</strong> {moment(o.date).format("DD/MM/YYYY")}</p>
                <p><strong>Statut :</strong> {o.order_status}</p>
                <p><strong>Boutique :</strong> {o?.vendor?.name}</p>
                <p><strong>Taille :</strong> {o?.size}</p>
                <p><strong>Couleur :</strong> {o?.color}</p>
                <p><strong>Quantité :</strong> {o?.qty}</p>
                <p><strong>Prix unitaire :</strong> {o?.product?.price} F</p>
                <p><strong>Total :</strong> {o?.price} F</p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-orders">📦 Aucune commande pour l’instant.</div>
        )}
      </div>

    </div>
  );
}

export default Orders;
