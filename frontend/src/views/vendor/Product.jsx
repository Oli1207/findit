import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import SidebarVendor from './SidebarVendor';
function Product() {
    
    const [products, setProducts] = useState([])

    const axios = apiInstance
    const userData = UserData()

    if (UserData()?.vendor_id === 0) {
        window.location.href = '/vendor/register/'
    }
    
    const fetchData = async () => {
        try {
            const response = await axios.get(`vendor/products/${userData?.vendor_id}/`)
            setProducts(response.data);
            console.log(response.data)
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

   

  return (
    <div style={{marginTop:"100px"}} className="container-fluid" id="main" >
    <div className="row row-offcanvas row-offcanvas-left h-100">
    <SidebarVendor/>
        <div className="col-md-9 col-lg-10 main mt-4">
            <>
                <h4>
                    <i className="bi bi-grid" /> All Products
                </h4>
                <div className="dropdown">
                    <button
                        className="btn btn-secondary dropdown-toggle  mt-3 mb-3 me-2"
                        type="button"
                        id="dropdownMenuButton1"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        Filter <i className="fas fa-sliders" />
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                        <li>
                            <button className="dropdown-item">
                                No Filter
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" >
                                Status: Published
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" >
                                Status: In Draft
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" >
                                Status: In-review
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" >
                                Status: Disabled
                            </button>
                        </li>

                        <hr />
                        <li>
                            <button className="dropdown-item" >
                                Date: Latest
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" >
                                Date: Oldest
                            </button>
                        </li>
                    </ul>
                    <Link to={'/add-product/'} className='btn btn-primary'>Add Product</Link>
                </div>
            </>
            <div className="mb-3 mt-2">
                <table className="table">
                    <thead className="table-dark">
                        <tr>
                            <th scope="col">Image</th>
                            <th scope="col">Name</th>
                            <th scope="col">Price</th>
                            <th scope="col">Quantity</th>
                            <th scope="col">Orders</th>
                            <th scope="col">Status</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products?.map((p, index) => (
                            <tr key={index}>
                                <th scope="row">
                                    <img src={p.image} style={{width:"100px", height:"70px", objectFit:"cover", borderRadius:"10px"}} alt="" />
                                </th>
                                <td>{p.title}</td>
                                <td>{p.price} frs</td>
                                <td>{p.stock_qty}</td>
                                <td>{p.orders}</td>
                                <td>{p?.status?.toUpperCase()}</td>
                                <td>
                                    <Link to={`/detail/${p.slug}`} className="btn btn-primary mb-1 me-2"><i className="fas fa-eye" /></Link>
                                    <Link to={`/vendor/product/update/${p.pid}/`} className="btn btn-success mb-1 me-2"><i className="fas fa-edit" /></Link>
                                    <button type='button'  className="btn btn-danger mb-1 me-2"><i className="fas fa-trash" /></button>
                                </td>
                            </tr>
                        ))}

                        {products?.length < 1 &&
                            <h4 className='p-3 mt-4'>No Products Yet</h4>
                        }

                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
  )
}

export default Product