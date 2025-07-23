import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import Swal from "sweetalert2";
import GetCurrentAddress from "../plugin/UserCountry";
import "./shop.css";
import { useMediaQuery } from "react-responsive";
import { useFollowStore } from "../../store/useFollowStore";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function Shop() {
  
    const [profileData, setProfileData] = useState(null);
  const [vendor, setVendor] = useState([]);
  const param = useParams();
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


  const [products, setProducts] = useState([]);
  const axios = apiInstance;
  const userData = UserData();
  const navigate = useNavigate()
  

  const [customAddress, setCustomAddress] = useState({
    mobile: "",
    address: "",
    city: "",
    state: "",
    // country: currentAddress.country,
  });

  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();

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


  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsResponse = await axios.get("products/");
        setProducts(productsResponse.data);
        console.log(productsResponse.data);

        const vendorIds = productsResponse.data
          .map((p) => p.vendor?.id)
          .filter((id) => id);
        await fetchFollowStates(vendorIds, userData?.user_id);
       
      } catch (error) {
        console.error("Erreur chargement produits :", error);
      }
    };

    fetchProducts();
  }, []);

  return (
  <div className="shop-container">
  <div className="shop-top-bar">
    <img src={vendor.image} alt={vendor.name} className="vendor-image" />
    <span className="vendor-name">{vendor.name}</span>
    <span style={{color:'black'}} onClick={() => navigate('/vendor/settings')}><i class="fas fa-cog"></i>
</span>
  </div>

 <span style={{color:'black', marginTop:"25px", marginBottom:"25px"}} className="">{vendor.description}</span>
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

export default Shop;
