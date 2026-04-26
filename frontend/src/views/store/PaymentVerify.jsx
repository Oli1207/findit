import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import "./paymentverify.css";

/**
 * Page de retour après paiement Paystack.
 * Paystack redirige vers :
 *   /payment/verify/?reference=xxx   ou   ?trxref=xxx&reference=xxx
 *
 * On appelle le backend pour vérifier et passer le statut à paid_holding.
 */
function PaymentVerify() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const [state, setState] = useState("loading"); // loading | success | error
  const [orderOid, setOrderOid] = useState("");
  const [errMsg,   setErrMsg]   = useState("");

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setState("error");
      setErrMsg("Aucune référence de paiement trouvée dans l'URL.");
      return;
    }

    apiInstance
      .get(`verify-payment/?reference=${reference}`)
      .then((res) => {
        setOrderOid(res.data.order_oid || "");
        setState("success");
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          "Une erreur est survenue lors de la vérification du paiement.";
        setErrMsg(msg);
        setState("error");
      });
  }, []);

  return (
    <div className="pv-page">
      {state === "loading" && (
        <div className="pv-card">
          <div className="pv-spinner" />
          <p className="pv-subtitle">Vérification du paiement en cours…</p>
        </div>
      )}

      {state === "success" && (
        <div className="pv-card">
          <div className="pv-icon pv-icon--success">
            <i className="fas fa-check-circle" />
          </div>
          <h2 className="pv-title">Paiement confirmé !</h2>
          <p className="pv-subtitle">
            Commande <strong>#{orderOid}</strong> sécurisée avec succès.
          </p>

          <div className="pv-info-box">
            <i className="fas fa-shield-alt pv-info-icon" />
            <div>
              <p className="pv-info-title">Comment ça fonctionne ?</p>
              <ol className="pv-steps">
                <li>Le vendeur prépare et expédie votre article.</li>
                <li>Vous recevez votre colis et l'inspectez.</li>
                <li>Si vous êtes satisfait·e, entrez votre <strong>code de validation</strong> dans <em>Mes achats</em>.</li>
                <li>Le paiement est alors reversé au vendeur.</li>
              </ol>
              <p className="pv-info-note">
                <i className="fas fa-envelope" /> Votre code de validation vous a été envoyé par e-mail.
              </p>
            </div>
          </div>

          <button className="pv-btn pv-btn--primary" onClick={() => navigate("/profile/")}>
            <i className="fas fa-shopping-bag me-2" />
            Voir mes achats
          </button>
          <button className="pv-btn pv-btn--outline" onClick={() => navigate("/")}>
            <i className="fas fa-home me-2" />
            Retour à l'accueil
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="pv-card">
          <div className="pv-icon pv-icon--error">
            <i className="fas fa-times-circle" />
          </div>
          <h2 className="pv-title">Paiement non confirmé</h2>
          <p className="pv-subtitle">{errMsg}</p>
          <p className="pv-info-note">
            Si vous avez été débité·e, contactez-nous à <a href="mailto:kangaholivier22@gmail.com">support@findit.deals</a>.
          </p>
          <button className="pv-btn pv-btn--primary" onClick={() => navigate("/")}>
            Retour à l'accueil
          </button>
        </div>
      )}
    </div>
  );
}

export default PaymentVerify;
