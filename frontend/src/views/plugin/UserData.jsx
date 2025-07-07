import Cookie from 'js-cookie';
import {jwtDecode} from 'jwt-decode';

function UserData() {
    let access_token = Cookie.get("access_token")
    let refresh_token = Cookie.get("refresh_token")

    if (access_token && refresh_token){
        try{
        const token = refresh_token
        const decoded = jwtDecode(token)
        return decoded
    }catch (error) {
        console.error("Invalid token:", error);
        return null;
      }
    } else {
      console.warn("No tokens found.");
      return null; // Retourne null explicitement si aucun token n'est trouvé
    


}
}

export default UserData;