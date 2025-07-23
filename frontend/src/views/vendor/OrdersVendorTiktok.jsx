import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import './ordersvendortiktok.css';

function OrdersVendorTiktok() {
  const [orders, setOrders] = useState([]);
  const [acceptedOrders, setAcceptedOrders] = useState({});
  const userData = UserData();
  const navigate = useNavigate();

  if (userData?.vendor_id === 0) {
    window.location.href = '/vendor/register/';
  }
  console.log(userData)
  useEffect(() => {
    apiInstance
      .get(`vendor/orders/${userData?.vendor_id}/`)
      .then(res => setOrders(res.data))
      .catch(console.error);
      console.log(orders)
  }, [userData?.vendor_id]);

  const handleAcceptOrder = (oid) => {
    setAcceptedOrders(prev => ({
      ...prev,
      [oid]: true
    }));
  };

  
  const handleStartConversation = async (userId) => {
    // const userId = userData?.user_id; // Exemple de récupération de l'ID utilisateur
    if (!userId) {
      alert("User ID is missing. Please log in.");
      return;
    }

    if (!userData?.vendor_id) {
      alert("Vendor ID is missing.");
      return;
    }

    try {
      const response = await apiInstance.post("conversations/", {
        user_id: userId,
        vendor_id: userData?.vendor_id,
      });
      const conversation = response.data;
      console.log("Conversation started:", conversation);

      navigate(`/conversation/${conversation?.id}`);
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
    <div className="orders-page">

      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar-title">Mes commandes</div>
        <div className="top-bar-icons">
          <span onClick={() => navigate('/vendor/messages')}><i class="fas fa-comment-alt"></i>
</span>
          <span onClick={() => navigate('/vendor/settings')}><i class="fas fa-cog"></i>
</span>
        </div>
      </div>

      {/* Orders */}
      <div className="orders-feed">
        {orders.length ? orders.map(o => (
          <div key={o.oid} className="order-cardd">
            {o.product?.image && (
              <img
                src={o.product.image}
                alt={o.product.title}
                className="order-product-image"
              />
            )}
            <div className="order-info">
              <h4>Commande <b>#{o.oid}</b></h4>
               <p><strong>Client :</strong> {o?.buyer?.full_name}</p>
              <p><strong>Date :</strong> {moment(o.date).format('DD/MM/YYYY')}</p>
              <p><strong>Produit :</strong> {o.product?.title}</p>
              <p><strong>Quantité :</strong> {o.qty}</p>
              <p><strong>Taille :</strong> {o.size}</p>
              <p><strong>Couleur :</strong> {o.color}</p>
              <p><strong>Statut :</strong> {o.order_status}</p>
              <p><strong>Adresse :</strong> {o.address}, {o.city}</p>

              <p>
                <strong>Téléphone :</strong>
                {!acceptedOrders[o.oid] ? (
                  <span style={{ filter: 'blur(5px)', marginLeft: '10px' }}> {o.mobile || 'N/A'}</span>
                ) : (
                  <span style={{ marginLeft: '10px' }}>{o.mobile || 'N/A'}</span>
                )}
              </p>
            </div>

            <div className="order-actions">
              {!acceptedOrders[o.oid] ? (
                <button className="btn-accept" onClick={() => handleAcceptOrder(o.oid)}><i class="fas fa-check"></i> {"    "}
 Accepter</button>
              ) : (
                 <button className="btn-accept"  onClick={() => handleStartConversation(o.buyer.id)}><i class="fas fa-comment-alt"></i> {"    "}
 Contacter</button>
              )}
            </div>
          </div>
        )) : (
          <div className="no-orders">Aucune commande pour l’instant.</div>
        )}
      </div>

    </div>
  );
}

export default OrdersVendorTiktok;
