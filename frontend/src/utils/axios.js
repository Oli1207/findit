import axios from 'axios';

const apiInstance = axios.create({
    baseURL: 'https://backend.findit.deals/api/v1/',
    timeout:1000000,

    headers: {
        'Content-Type':'multipart/form-data',
        Accept: 'application/json',
    }
})

export default apiInstance
















