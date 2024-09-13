import { useState } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'


import Register from './views/auth/Register'
import Login from './views/auth/Login'
import Dashboard from './views/auth/Dashboard'
import Logout from './views/auth/Logout'
import StoreFooter from './views/base/StoreFooter'
import StoreHeader from './views/base/StoreHeader'
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



function App() {
  

  return (
    <BrowserRouter>
    <StoreHeader />
  
     <MainWrapper>
     <Routes>
        <Route path='/register' element={<Register/>}/>
        <Route path='/login' element={< Login />}/>
        <Route path='/logout' element={< Logout />}/>
        <Route path="/dashboard" element={<Dashboard />}/>
      
        <Route path="/" element={<Products />}/>
        <Route path="/explore" element={<Explore />}/>
        <Route path="/detail/:slug/" element={<ProductDetail />}/>
        <Route path="/cart/" element={<Cart />}/>
        <Route path="/checkout/:order_oid/" element={<Checkout />}/>
        <Route path="/payment-success/:order_oid/" element={<PaymentSuccess/>}/>
        <Route path="/customer/account/" element={<PrivateRoute><Account/></PrivateRoute>}/>
        
        <Route path="/customer/orders/" element={<PrivateRoute><Orders/></PrivateRoute>}/>

      <Route path="/customer/order/:order_oid/" element={<PrivateRoute><OrderDetail/></PrivateRoute>}/>
      </Routes>
     </MainWrapper>
      <StoreFooter />
     
    </BrowserRouter>
  )
}

export default App
