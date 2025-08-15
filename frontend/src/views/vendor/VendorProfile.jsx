import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import Swal from "sweetalert2";
import "./shop.css";
import { useFollowStore } from "../../store/useFollowStore";
import './shop.css'
import './ordersvendortiktok.css';
import moment from 'moment';

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function VendorProfile() {
   const [profileData, setProfileData] = useState({ 'full_name': '', 'mobile': '', 'email': '', 'about': '', 'country': '', 'city': '', 'state': '', 'address': '', 'p_image': '', });
    const [vendorData, setVendorData] = useState([]);
    const [vendorImage, setVendorImage] = useState("");
    const [profileImage, setprofileImage] = useState("");
  
  
  const [vendor, setVendor] = useState([]);
  const [products, setProducts] = useState([]);
  const [videos, setVideos] = useState([]); // future data vidéos
  const [orders, setOrders] = useState([]); // commandes reçues
  const [myOrders, setMyOrders] = useState([]); // mes commandes
  const [activeTab, setActiveTab] = useState("products");
const [presentations, setPresentations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [acceptedOrders, setAcceptedOrders] = useState({});
  const param = useParams();
  const axios = apiInstance;
  const userData = UserData();
  const navigate = useNavigate();

  const { fetchFollowStates } = useFollowStore();

  
    useEffect(() => {
    apiInstance.get(`customer/orders/${userData?.user_id}`).then((res) => {
      setMyOrders(res.data);
    });
  }, [userData?.user_id]);

  useEffect(() => {
    fetchVideos();
  }, []);

  
    const fetchProfileData = async () => {
      try {
        axios.get(`vendor-settings/${userData?.user_id}/`).then((res) => {
          // setProfileData(res.data);
          setProfileData({
            'full_name': res.data?.full_name,
            'email': res.data.user.email,
            'phone': res.data.user.phone,
            'about': res.data.about,
            'country': res.data.country,
            'city': res.data.city,
            'state': res.data.state,
            'address': res.data.address,
            'p_image': res.data.image,
          })
          setprofileImage(res.data.image)
          console.log(profileData)
        })
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
  
    const fetchVendorData = async () => {
      try {
        axios.get(`vendor-shop-settings/${userData?.vendor_id}/`).then((res) => {
          setVendorData(res.data)
          setVendorImage(res.data.image)
          console.log("res.data.image:", res.data.image);
          console.log(userData)
        })
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
  
    useEffect(() => {
      fetchProfileData();
      fetchVendorData();
    }, []);
    
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get("presentations/");
      setVideos(res.data);
      console.log(videos)
    } catch (error) {
      console.error("Erreur chargement vidéos :", error);
    }
    setLoading(false);
  };

  const handleAcceptOrder = (oid) => {
    setAcceptedOrders(prev => ({
      ...prev,
      [oid]: true
    }));
  };

   useEffect(() => {
          const fetchData = async () => {
              try {
                  const response = await axios.get(`vendor/orders/${userData?.vendor_id}/`)
                  console.log(response.data)
                  setOrders(response.data);
              } catch (error) {
                  console.error('Error fetching data:', error);
              }
          };
  
          fetchData();
      }, []);
    
      useEffect(() => {
  const fetchVendorProducts = async () => {
    try {
      const response = await axios.get(`vendor-products/${userData?.vendor_id}/`);
      setProducts(response.data.products); // <-- récupère bien le tableau
    } catch (error) {
      console.error("Erreur lors de la récupération des produits :", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`user/profile/${userData?.user_id}/`);
      setProfileData(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération du profil :", error);
    }
  };

  fetchVendorProducts();
  fetchProfile();
}, []);

  return (
    <div className="shop-container">
      {/* Barre du haut */}
      <div className="shop-top-bar">
        <img src={vendorData?.image} alt={vendorData?.name} className="vendor-image" />
        <span style={{color:'black'}} className="vendor-name">{vendorData?.name}</span>
        <span style={{ color: "black" }} onClick={() => navigate("/vendor/settings")}>
          <i className="fas fa-cog"></i>
        </span>
      </div>

      {/* Description */}
      <span style={{ color: "black", marginTop: "25px", marginBottom: "25px" }}>
        {vendorData?.description}
      </span>

      {/* Onglets style Instagram */}
      <div className="shop-tabs">
        <button
          className={activeTab === "products" ? "active" : ""}
          onClick={() => setActiveTab("products")}
        >
          <i className="fas fa-th"></i>
        </button>
        <button
          className={activeTab === "videos" ? "active" : ""}
          onClick={() => setActiveTab("videos")}
        >
          <i className="fas fa-video"></i>
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          <i className="fas fa-receipt"></i>
        </button>
        <button
          className={activeTab === "myOrders" ? "active" : ""}
          onClick={() => setActiveTab("myOrders")}
        >
          <i className="fas fa-shopping-bag"></i>
        </button>
      </div>

      {/* Contenu selon l'onglet actif */}
      <div className="shop-feed-container">
        {activeTab === "products" && (
          <div className="shop-feed-grid">
      {products?.map((p) => (
             <div className="shop-feed-item" key={p.id}>
                <Link to={`/detail/${p.slug}`}>
               <img
                 src={p.image}
                 alt={p.title}
                 className="shop-feed-image"
                 loading="lazy"
               />
               </Link>
             </div>
           ))}

          </div>
        )}

        {activeTab === "videos" && (
  <div className="shop-feed-grid">
    {videos.length > 0 ? (
      videos.map((v) => (
        <div className="shop-feed-item" key={v.id}>
          <Link to={`/presentation/${v.id}`}>
            {/* Miniature vidéo */}
            <video
              src={v.url}
              className="shop-feed-image"
              muted
              preload="metadata"
              // poster={v.thumbnail || "default-thumbnail.jpg"} // si tu as une miniature
            />
          </Link>
        </div>
      ))
    ) : (
      <p style={{ color: "black" }}>Aucune vidéo disponible</p>
    )}
  </div>
)}


        {activeTab === "orders" && (
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
        )}

        {activeTab === "myOrders" && (
          <div>
              {myOrders.length > 0 ? (
                     myOrders.map((mo, index) => (
                       <div key={index} className="order-cardd">
                         <h4>Commande #{mo.oid}</h4>
                         <img src={mo?.product?.image} alt="product-img" className="order-product-image" />
                         <div className="order-info">
                           <p><strong>Date :</strong> {moment(mo.date).format("DD/MM/YYYY")}</p>
                           <p><strong>Statut :</strong> {mo.order_status}</p>
                           <p><strong>Boutique :</strong> {mo?.vendor?.name}</p>
                           <p><strong>Taille :</strong> {mo?.size}</p>
                           <p><strong>Couleur :</strong> {mo?.color}</p>
                           <p><strong>Quantité :</strong> {mo?.qty}</p>
                           <p><strong>Prix unitaire :</strong> {mo?.product?.price} F</p>
                           <p><strong>Total :</strong> {mo?.price} F</p>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="no-orders">📦 Aucune commande pour l’instant.</div>
                   )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorProfile;
