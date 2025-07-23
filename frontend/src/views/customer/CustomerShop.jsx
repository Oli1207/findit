import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import Swal from 'sweetalert2';
import GetCurrentAddress from '../plugin/UserCountry';
import { useMediaQuery } from "react-responsive";
import { useFollowStore } from '../../store/useFollowStore';



const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function CustomerShop() {
    const userData = UserData();
    const [vendor, setVendor] = useState([])
    const [products, setProducts] = useState([])
    const param = useParams()
   const navigate = useNavigate()

  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();
      
      const isMobile = useMediaQuery({ maxWidth: 768 });
      const axios = apiInstance
    useEffect(() => {
       
    }, [] )

    useEffect(() => {
        const fetchData = async () => {
          try {
            // Récupérer les produits
            
            const productsResponse = await apiInstance.get(`vendor/products/${param.slug}/`)
            const productsData = productsResponse.data;
                setProducts(productsData)
            


            
                apiInstance.get(`shop/${param.slug}/`).then((res) =>{
                    setVendor(res.data)
                })
    
            // Initialiser les états de suivi
                   const vendorIds = productsResponse.data.map((p) => p.vendor?.id).filter((id) => id);
        await fetchFollowStates(vendorIds, userData?.user_id);
          } catch (error) {
            console.error("Erreur lors du chargement des produits et des états de suivi :", error);
          }
        };
    
        fetchData();
      }, []);

    




  
  
  
    
    
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
    
return (
  <div className="shop-container">
    {/* Top bar Instagram style */}
    <div className="shop-top-bar">
      <img src={vendor.image} alt={vendor.name} className="vendor-image" />
      <span className="vendor-name">{vendor.name} <br /> <span style={{color:'black', fontWeight:'lighter'}} onClick={() =>
                      toggleFollow(userData?.user_id, vendor?.id)
                    }>{followStates[vendor?.id]
                      ? "Arrêter de suivre"
                      : "S’abonner"}
</span></span>
      <i className="fas fa-ellipsis-v menu-icon"></i>
       
          <span style={{color:'black'}}  onClick={() => handleStartConversation(vendor?.id)}><i class="fas fa-comment-alt"></i>
</span>
          
    </div>
<span style={{color:'black', marginTop:"25px", marginBottom:"25px"}} className="">{vendor.description}</span>
  
    {/* Feed grid */}
    <div className="shop-feed-container">
      <div className="shop-feed-grid">
        {products.map((p) => (
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
    </div>
  </div>
);

}

export default CustomerShop