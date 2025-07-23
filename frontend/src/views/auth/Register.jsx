import React, { useState, useEffect } from 'react';
import { login, register, setAuthUser } from '../../utils/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { GoogleLogin } from '@react-oauth/google';
import apiInstance from '../../utils/axios';
import Swal from 'sweetalert2'

function Register() {
  const [full_name, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const handleGoogleLogin = async (tokenId, navigate) => {
    const axios = apiInstance;
    try {
        const { data } = await axios.post("user/google-login/", {
            access_token: tokenId,
        });

        if (data.access && data.refresh) {
            setAuthUser(data.access, data.refresh);
            // Swal.fire("Connexion réussie avec Google", "", "success");
            navigate("/");
        } else {
            console.warn("Réponse inattendue du backend", data);
        }
    } catch (error) {
        console.error("Erreur Google Login :", error);
        console.log("Réponse d'erreur :", error.response?.data);
        Swal.fire("Erreur", "Impossible de se connecter avec Google", "error");
    }
};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await register(
      full_name,
      email,
      phone,
      password,
      password2
    );
    
    setIsLoading(false);
    if (error) {
      alert(JSON.stringify(error));
    } else {
      navigate('/');
    }
  };

  return (
    <div className="container" style={{paddingTop:"80px", marginTop: "50px", display: "flex", justifyContent: "center" }}>
      <div className="row w-100">
        {/* Left side with catchy message */}
        <div className="col-md-6 d-flex align-items-center">
          <div>
            <h2>Rejoignez notre communauté !</h2>
            <p>
              Créez un compte dès maintenant et accédez à tous nos services exclusifs.
              C'est rapide, facile, et vous ne le regretterez pas !
            </p>
          </div>
        </div>

        {/* Right side with the form */}
        <div className="col-md-6">
          <div className="p-4 border rounded shadow-sm">
            <h3 className="text-center">Créer un compte</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Nom et Prénoms" 
                  value={full_name} 
                  onChange={(e) => setFullname(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-3">
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-3">
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Numéro de téléphone" 
                  value={phone} 
                  onChange={(e) => setMobile(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-3">
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Mot de passe" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-3">
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Confirmer le mot de passe" 
                  value={password2} 
                  onChange={(e) => setPassword2(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                {isLoading ? "Création en cours..." : "Créer un compte"}
              </button>
            </form>
            <GoogleLogin
  onSuccess={(credentialResponse) => {
    const tokenId = credentialResponse.credential;
    handleGoogleLogin(tokenId, navigate); // mutualisé
  }}
  onError={() => {
    Swal.fire("Erreur", "La connexion Google a échoué", "error");
  }}
/>
            <div className="text-center mt-3">
              <p>Vous avez déjà un compte? <a href="/login">Se connecter</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
