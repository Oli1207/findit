import React, { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import UserData from '../plugin/UserData'
import apiInstance from '../../utils/axios'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'


function Wishlist() {
    const [wishlist, setWishlist] = useState([])

    const userData = UserData()

    const fetchWishList = async () => {
        apiInstance.get(`customer/wishlist/${userData?.user_id}/`).then((res) => {
            setWishlist(res.data)
     } )
}

useEffect(() => {
    fetchWishList()
    }, [])

    const addToWishList = async (productId, userId) => {
        try {
         const formdata = new FormData()
         formdata.append('product_id', productId)
         formdata.append('user_id', userId)
     
         const response = await apiInstance.post(`customer/wishlist/${userId}/`, formdata)
         console.log(response.data)
         fetchWishList()
     
         Swal.fire({
           icon: 'success',
           title: response.data.message,
         })
        } catch (error) {
         console.log(error)
        }
     }

  return (
   
            // <div className="row">
            //     {/* Sidebar Here */}
            //     {/* <Sidebar/> */}

            //     <div className="col-lg-9">
            //         <section className="">
            //             <main className="mb-5" style={{}}>
            //                 <div className="container">
                                <section style={{marginTop:"20px"}} className="">
                                    <div className="row">
                                        
                                        <h3 className="mb-3">
                                            <i className="fas fa-heart text-danger" /> Wishlist
                                        </h3>
                                        
                                        {wishlist?.map((w, index) => (
                <div className="col-lg-4 col-md-12 mb-4" key={index}>
                  <div className="card">
                    <div className="bg-image hover-zoom ripple" data-mdb-ripple-color="light">
                    <Link to={`/detail/${w.product.slug}`}>
                    <img
                        src={w.product?.image}
                        className="w-100"
                        style={{ width: "100%", height: "250px", objectFit: "cover" }}
                        alt={w.product.title}
                      /></Link>
                      <a href="#!">
                        <div className="mask">
                          <div className="d-flex justify-content-start align-items-end h-100">
                            <h5>
                              <span className="badge badge-primary ms-2">New</span>
                            </h5>
                          </div>
                        </div>
                        <div className="hover-overlay">
                          <div className="mask" style={{ backgroundColor: "rgba(251, 251, 251, 0.15)" }} />
                        </div>
                      </a>
                    </div>
                    <div className="card-body">
                    <Link to={`/detail/${w.product.slug}`}>
                        <h5 className="card-title mb-3">{w.product.title}</h5>
                    </Link>
                      <a href="#!" className="text-reset">
                        <p>{w.product.category?.title}</p>
                      </a>
                      <div className="d-flex justify-content-center">
                        <h6 className="mb-3">{w.product.price}frs</h6>
                        <h6 className="mb-3 text-muted"><strike>{w.product.old_price}</strike></h6>
                      </div>
                      <div className="btn-group">
                       
                        <button 
                        type="button"
                        className="btn btn-danger px-3 me-1 ms-2"
                        onClick={() => addToWishList(w.product.id, userData?.user_id)}
                         >
                          <i className="fas fa-heart" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
                                        {wishlist.length < 1 && 
                                             <h6 className='container'>Your wishlist is Empty </h6>
                                        }
                                        
                                       


                                    </div>
                                </section>
            //                 </div>
            //             </main>
            //         </section>
            //     </div>
            // </div>
      
  )
}

export default Wishlist