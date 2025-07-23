import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { registerSW } from 'virtual:pwa-register'

registerSW()
// Hey buddy, welcome to the root component :)
ReactDOM.createRoot(document.getElementById('root')).render(
    <GoogleOAuthProvider clientId="928119001851-5gvirbilbfefb6pksgi43vdomk51npa0.apps.googleusercontent.com">
  <App />
</GoogleOAuthProvider>
)
