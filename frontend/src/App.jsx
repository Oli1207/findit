import { Routes, Route, BrowserRouter } from 'react-router-dom'
import Register from './views/auth/Register'
import Login from './views/auth/Login'
import Logout from './views/auth/Logout'
import MainWrapper from './layout/MainWrapper'
import Products from './views/store/Products'
import Explore from './views/store/Explore'
import ProductDetail from './views/store/ProductDetail'
import Cart from './views/store/Cart'
import Checkout from './views/store/Checkout'
import PaymentSuccess from './views/store/PaymentSuccess'
import Account from './views/customer/Account'
import PrivateRoute from './layout/PrivateRoute'
import Orders from './views/customer/Orders'
import OrderDetail from './views/customer/OrderDetail'
import Wishlist from './views/customer/Wishlist'
import AddProduct from './views/store/AddProduct'
import Search from './views/store/Search'
import Vendor from './views/vendor/Vendor'
import Product from './views/vendor/Product'
import VendorSettings from './views/vendor/VendorSettings'
import Shop from './views/vendor/Shop'
import Chat from './views/store/Chat'
import OrdersVendor from './views/vendor/OrdersVendor'
import VendorMessages from './views/vendor/VendorMessages'
import CustomerMessages from './views/customer/CustomerMessages'
import OrderDetailVendor from './views/vendor/OrderDetailVendor'
import ForgotPassword from './views/auth/ForgotPassword'
import CustomerShop from './views/customer/CustomerShop'
import DashboardVendor from './views/vendor/DashboardVendor'
import HomeScreen from './views/store/HomeScreen'
import VideoLayout from './layout/VideoLayout'  // ✅ Ajout ici
import TikTokFeed from './views/store/TiktokFeed'
import ProductDetailFeed from './views/store/ProductDetailFeed'
import OrdersVendorTiktok from './views/vendor/OrdersVendorTiktok'
import FollowedVendorsFeed from './views/store/FollowedVendorsFeed'
import CreateNewPassword from './views/auth/CreateNewPassword'
import { ReloadPrompt } from './Prompt'
import InstallButton from './InstallButton'
import PWAInstallPrompt from './views/store/PWAInstallPrompt'

function App() {
  return (
    <>
      <ReloadPrompt/>
    <InstallButton />
     <PWAInstallPrompt />
    <BrowserRouter>
      <Routes>
    
        {/* Route spéciale TikTok-like avec VideoLayout */}
        <Route path="/home" element={
          <VideoLayout>
            <HomeScreen />
          </VideoLayout>
        } />

        {/* Les autres routes dans MainWrapper */}
        <Route path="/" element={<MainWrapper><TikTokFeed /></MainWrapper>} />
        <Route path="/ancien" element={<MainWrapper><Products /></MainWrapper>} />
        <Route path="/suivis" element={<MainWrapper><FollowedVendorsFeed /></MainWrapper>} />
        <Route path="/register" element={<MainWrapper><Register /></MainWrapper>} />
        <Route path="/login" element={<MainWrapper><Login /></MainWrapper>} />
        <Route path="/logout" element={<MainWrapper><Logout /></MainWrapper>} />
        {/* <Route path="/dashboard" element={<MainWrapper><Dashboard /></MainWrapper>} /> */}
        <Route path="/forgot-password" element={<MainWrapper><ForgotPassword /></MainWrapper>} />
          <Route path="/create-new-password" element={<MainWrapper><CreateNewPassword /></MainWrapper>} />
        <Route path="/haul" element={<MainWrapper><Explore /></MainWrapper>} />
        <Route path="/detail/:slug/" element={<MainWrapper><ProductDetailFeed /></MainWrapper>} />
        <Route path="/cart/" element={<MainWrapper><Cart /></MainWrapper>} />
        <Route path="/checkout/:order_oid/" element={<MainWrapper><Checkout /></MainWrapper>} />
        <Route path="/payment-success/:order_oid/" element={<MainWrapper><PaymentSuccess /></MainWrapper>} />

        {/* Routes clients sécurisées */}
        <Route path="/customer/account/" element={<MainWrapper><PrivateRoute><Account /></PrivateRoute></MainWrapper>} />
        <Route path="/customer/orders/" element={<MainWrapper><PrivateRoute><Orders /></PrivateRoute></MainWrapper>} />
        <Route path="/customer/order/:order_oid/" element={<MainWrapper><PrivateRoute><OrderDetail /></PrivateRoute></MainWrapper>} />
        <Route path="/customer/wishlist/" element={<MainWrapper><PrivateRoute><Wishlist /></PrivateRoute></MainWrapper>} />
        <Route path="/add-product/" element={<MainWrapper><PrivateRoute><AddProduct /></PrivateRoute></MainWrapper>} />
        <Route path="/search" element={<MainWrapper><Search /></MainWrapper>} />

        {/* Routes vendeur sécurisées */}
        <Route path="/vendor/" element={<MainWrapper><PrivateRoute><Vendor /></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/dashboard" element={<MainWrapper><PrivateRoute><DashboardVendor /></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/products/" element={<MainWrapper><PrivateRoute><Product /></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/settings/" element={<MainWrapper><PrivateRoute><VendorSettings /></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/:slug/" element={<MainWrapper><PrivateRoute><Shop /></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/orders/" element={<MainWrapper><PrivateRoute><OrdersVendorTiktok/></PrivateRoute></MainWrapper>} />
        <Route path="/vendor/order/:order_oid" element={<MainWrapper><PrivateRoute><OrderDetailVendor /></PrivateRoute></MainWrapper>} />

        {/* Chat et messagerie */}
        <Route path="/conversation/:conversationId" element={<MainWrapper><Chat /></MainWrapper>} />
        <Route path="/customer/messages" element={<MainWrapper><CustomerMessages /></MainWrapper>} />
        <Route path="/vendor/messages" element={<MainWrapper><VendorMessages /></MainWrapper>} />
        <Route path="/customer/chat/:conversationId" element={<MainWrapper><Chat /></MainWrapper>} />
        <Route path="/vendor/chat/:conversationId" element={<MainWrapper><Chat /></MainWrapper>} />

        {/* Shop client */}
        <Route path="/customer/:slug/" element={<MainWrapper><CustomerShop /></MainWrapper>} />

      </Routes>
    </BrowserRouter>
     </>
  )
}

export default App
