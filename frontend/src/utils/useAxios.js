import axios from 'axios'
import { isAccessTokenExpired, setAuthUser, getRefreshToken } from './auth'
import { BASE_URL } from './constants'
import Cookies from 'js-cookie'

const useAxios = async () => {
    const access_token = Cookies.get("access_token")
    const refresh_token = Cookies.get("refresh_token")

    const axiosInstance = axios.create({
        baseURL: BASE_URL,
        headers: { Authorization: `Bearer ${access_token}`}
    })

    axiosInstance.interceptors.request.use(async (req) => {
        const access_token = Cookies.get("access_token");
        if (isAccessTokenExpired(access_token)) {
            const response = await getRefreshToken(); // Refresh the token
            setAuthUser(response.access, response.refresh); // Update tokens
            req.headers.Authorization = `Bearer ${response.access}`;
        }
        return req;
    });
    
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                logout(); // Clear user state and tokens
                window.location.href = '/login'; // Redirect to login
            }
            return Promise.reject(error);
        }
    );
    

    return axiosInstance
}

export default useAxios








