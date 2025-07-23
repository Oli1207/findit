import React, { useState, useEffect } from 'react';
import { login, setAuthUser } from '../../utils/auth';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../../assets/findit_logoo.png';
import { useAuthStore } from '../../store/auth';
import './login.css'; // Ajout d'un fichier CSS pour le style
import { GoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2'
import apiInstance from '../../utils/axios';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const axios = apiInstance

const handleGoogleLogin = async (tokenId, navigate) => {
    
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

    useEffect(() => {
        if (isLoggedIn()) {
            navigate('/');
        }
    }, [isLoggedIn, navigate]);

    const resetForm = () => {
        setEmail(""); 
        setPassword("");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await login(email, password);
        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please review your credentials'
            });
            setIsLoading(false);
        } else {
            navigate("/");
            resetForm();
        }
    };

    return (
        <div  className="login-container">
            <div className="login-logo">
  <img src={logo} alt="Findit Logo" />
  <h2>Connectez-vous pour vendre ou acheter sur Findit</h2>
</div>
            <div className="login-box">
                <form onSubmit={handleLogin} className="login-form">
                    <input 
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        required
                    />
                    <input 
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        required
                    />
                    <button type="submit" className="login-btn">
                        {isLoading ? "Loading..." : "Log In"}
                    </button>
                </form>
                <hr />
             <GoogleLogin
  onSuccess={(credentialResponse) => {
    const tokenId = credentialResponse.credential;
    handleGoogleLogin(tokenId, navigate); // mutualisé
  }}
  onError={() => {
    Swal.fire("Erreur", "La connexion Google a échoué", "error");
  }}
  
/>
<hr />
                <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
                <div className="sign-up-prompt">
                    <p>Vous n'avez pas de compte ? <Link to="/register" className="forgot-password">S'inscrire</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Login;
