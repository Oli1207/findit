import { useAuthStore } from '../store/auth';
import axios from 'axios';
import { jwtDecode } from "jwt-decode"; // Import selon la documentation officielle
import Cookies from 'js-cookie';
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position:"top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

export const login = async (email, password) => {
    try {
        const { data, status } = await axios.post('http://192.168.1.13:8000/api/v1/user/token/', {
            email, password
        });

        if (status === 200) {
            setAuthUser(data.access, data.refresh);

            Toast.fire({
                icon: 'success',
                title: "Vous êtes connecté"
              })
        }

        return { data, error: null };
    } catch (error) {
        console.log(error);
        return {
            data: null,
            error: error.response.data?.detail || 'Something went wrong'
        };
    }
};

export const register = async (full_name, email, phone, password, password2) => {
    try {
        const { data } = await axios.post('http://192.168.1.13:8000/api/v1/user/register/', {
            full_name,                     
            email,
            phone,
            password,
            password2,
        });

        // Effectuer la connexion après l'enregistrement
        await login(email, password);

        Toast.fire({
            icon: 'success',
            title: "Bienvenue sur Findit"
          })
    
        return { data, error: null };
    } catch (error) {
        
        return {
            data: null,
            error: error.response.data?.detail || 'Something went wrong'
        };
    }
};

export const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    useAuthStore.getState().setUser(null);
};

export const setUser = async () => {
    const accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    if (!accessToken || !refreshToken) {
        return;
    }

    if (isAccessTokenExpired(accessToken)) {
        try {
            const response = await getRefreshToken(); // No need to pass refresh_token as an argument
            // Update only the access token with the new one from the response
            setAuthUser(response.access, refreshToken);
        } catch (error) {
            console.error("Failed to refresh token:", error);
            // Optionally, log out the user or prompt for re-authentication
        }
    } else {
        setAuthUser(accessToken, refreshToken);
    }
};


export const setAuthUser = (access_token, refresh_token) => {
    Cookies.set('access_token', access_token, {
        expires: 1,
        secure: false
    });
    Cookies.set('refresh_token', refresh_token, {
        expires: 7,
        secure: false
    });
    const user = jwtDecode(access_token) ?? null;;

    if (user) {
        useAuthStore.getState().setUser(user);
    }
    useAuthStore.getState().setLoading(false);
};

export const getRefreshToken = async () => {
    const refresh_token = Cookies.get("refresh_token");

    if (!refresh_token) {
        logout();
        console.error("Missing refresh token");
        throw new Error("Missing refresh token");
    }

    try {
        const response = await axios.post('http://192.168.1.13:8000/api/v1/user/token/refresh/', {
            refresh: refresh_token,
        });
        return response.data; // Expected to return { access: 'new_access_token' }
    } catch (error) {
        logout();
        console.error("Error refreshing token:", error);
        throw error; // Propagate the error to be handled by the caller
    }
};


export const isAccessTokenExpired = (accessToken) => {
    try {
        const decodedToken = jwtDecode(accessToken);
        return decodedToken.exp < Date.now() / 1000;
    } catch (error) {
        console.log(error);
        return true;
    }
};
