/**
 * useEscrowOrder — Hook partagé pour le flow de commande escrow Paystack.
 *
 * Utilisé dans : TiktokFeed, FollowedVendorsFeed, VendorProfile
 *
 * Flow :
 *   1. handlePayWithPaystack(product_id, price, vendor_id)
 *      → POST /initiate-payment/
 *      → redirige vers Paystack
 *   2. handleValidateDelivery(order_oid, code)
 *      → POST /validate-delivery/
 *   3. handleMarkShipped(order_oid)    [vendeur seulement]
 *      → POST /orders/<oid>/ship/
 */
import { useNavigate } from "react-router-dom";
import apiInstance from "../utils/axios";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: "#1a1a1a",
  color: "#fff",
});

export function useEscrowOrder({
  userData,
  qtyValue,
  sizeValue,
  colorValue,
  profileData,
  useProfileAddress,
  customAddress,
  onOrderSuccess,   // callback après initiation réussie (optionnel)
}) {
  const navigate = useNavigate();

  /**
   * Lance le paiement Paystack pour un produit.
   * Redirige vers la page de paiement Paystack.
   */
  const handlePayWithPaystack = async (product_id, price, vendor_id) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Connecte-toi pour commander." });
      return navigate("/login");
    }

    // On utilise le profil seulement si la case est cochée ET que le profil est complet
    const hasProfileAddress =
      profileData?.mobile && profileData?.address && profileData?.city;
    const shouldUseProfile = useProfileAddress && hasProfileAddress;

    const mobile  = shouldUseProfile ? profileData.mobile  : customAddress?.mobile;
    const address = shouldUseProfile ? profileData.address : customAddress?.address;
    const city    = shouldUseProfile ? profileData.city    : customAddress?.city;

    if (!mobile || !address || !city) {
      Toast.fire({ icon: "warning", title: "Renseigne ton adresse de livraison (téléphone, adresse, ville)." });
      return;
    }

    const payload = {
      product_id,
      qty      : qtyValue  || 1,
      price,
      vendor   : vendor_id,
      size     : sizeValue  || "No Size",
      color    : colorValue || "No Color",
      full_name: userData.full_name || "",
      mobile,
      address,
      city,
      state   : shouldUseProfile ? (profileData?.state   || "") : "",
      country : shouldUseProfile ? (profileData?.country || "") : "",
    };

    try {
      const { data } = await apiInstance.post("initiate-payment/", payload);

      if (onOrderSuccess) onOrderSuccess(data.order_oid);

      // Redirection vers Paystack (page hébergée, mobile-friendly)
      window.location.href = data.authorization_url;
    } catch (err) {
      const msg = err?.response?.data?.message || "Erreur lors de l'initialisation du paiement.";
      Swal.fire({ icon: "error", title: "Erreur", text: msg, background: "#1a1a1a", color: "#fff" });
    }
  };

  /**
   * Le client valide la réception en entrant son code.
   */
  const handleValidateDelivery = async (order_oid, code, onSuccess) => {
    if (!code.trim()) {
      Toast.fire({ icon: "warning", title: "Entre ton code de validation." });
      return;
    }
    try {
      const { data } = await apiInstance.post("validate-delivery/", {
        order_oid,
        validation_code: code.trim().toUpperCase(),
      });
      Toast.fire({ icon: "success", title: data.message });
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message || "Code incorrect ou commande introuvable.";
      Toast.fire({ icon: "error", title: msg });
    }
  };

  /**
   * Le vendeur marque une commande comme expédiée.
   */
  const handleMarkShipped = async (order_oid, onSuccess) => {
    try {
      const { data } = await apiInstance.post(`orders/${order_oid}/ship/`);
      Toast.fire({ icon: "success", title: data.message });
      if (onSuccess) onSuccess(order_oid);
    } catch (err) {
      const msg = err?.response?.data?.message || "Impossible de marquer comme expédié.";
      Toast.fire({ icon: "error", title: msg });
    }
  };

  return { handlePayWithPaystack, handleValidateDelivery, handleMarkShipped };
}
