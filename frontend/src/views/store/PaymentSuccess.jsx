import React, { useEffect, useState } from 'react';
import apiInstance from '../../utils/axios';
import { useParams } from 'react-router-dom';

function PaymentSuccess() {
    const [order, setOrder] = useState({});
    const [status, setStatus] = useState("verifying");

    const param = useParams();
    const urlParam = new URLSearchParams(window.location.search);
    const sessionId = urlParam.get("session_id");

    useEffect(() => {
        apiInstance.get(`checkout/${param.order_oid}/`).then((res) => {
            console.log(res.data);
            setOrder(res.data);
         
        });
    }, [param]);

    useEffect(() =>{
        const formdata = new FormData()
        formdata.append('order_oid', param?.order_oid)
        formdata.append('session_id', sessionId)

        setStatus("verifying")

        apiInstance.post(`payment-success/${order.oid}/`, formdata)
        .then((res) =>{
            if (res.data.message === 'paiement effectué'){
                setStatus("paiement effectué")
            }
            if (res.data.message === 'déjà payé'){
                setStatus("déjà payé")
            }
            if (res.data.message === 'facture non payée'){
                setStatus("facture non payée")
            }

        })
    }, [param?.order_oid])

    return (
        <main className="mb-4 mt-4 h-100">
            <div className="container">
                {/* Section: Checkout form */}
                <section className="">
                    <div className="gx-lg-5">
                        <div className="row pb50">
                            <div className="col-lg-12"></div>
                        </div>
                        <div className="row">
                            <div className="col-xl-12">
                                <div className="application_statics">
                                    <div className="account_user_deails dashboard_page">
                                        <div className="d-flex justify-content-center align-items-center">
                                           {status === "verifying" &&
                                             <div className="col-lg-12">
                                             <div className="border border-3 border-warning" />
                                             <div className="card bg-white shadow p-5">
                                                 <div className="mb-4 text-center">
                                                     <i
                                                         className="fas fa-spinner fa-spin text-warning"
                                                         style={{ fontSize: 100, color: "green" }}
                                                     />
                                                 </div>
                                                 <div className="text-center">
                                                     <h1>Vérification du paiement...</h1>
                                                     <p>
                                                      <b className='text-success'>  veuillez patienter pendant que nous vérifions votre paiement</b>
                                                            <br />
                                                            <b className='text-danger'>VEUILLEZ RESTER SUR LA PAGE SANS RECHARGER</b>
                                                     </p>
                                                    
                                                 </div>
                                             </div>
                                         </div>
                                           }
                                            {status === "facture non payée" &&
                                                 <div className="col-lg-12">
                                                 <div className="border border-3 border-danger" />
                                                 <div className="card bg-white shadow p-5">
                                                     <div className="mb-4 text-center">
                                                         <i
                                                             className="fas fa-ban text-danger"
                                                             style={{ fontSize: 100, color: "red" }}
                                                         />
                                                     </div>
                                                     <div className="text-center">
                                                         <h1>Facture non payée <i className='fas fa-ban'></i></h1>
                                                         <p>
                                                         
                                                                <b className='text-danger'>S'il vous plait essayez de refaire le paiement</b>
                                                         </p>
                                                        
                                                     </div>
                                                 </div>
                                             </div>
                                            }
                                             {status === 'déjà payé' && 
                                             <div className="col-lg-12">
                                             <div className="border border-3 border-success" />
                                             <div className="card bg-white shadow p-5">
                                                 <div className="mb-4 text-center">
                                                     <i
                                                         className="fas fa-check-circle text-success"
                                                         style={{ fontSize: 100, color: "green" }}
                                                     />
                                                 </div>
                                                 <div className="text-center">
                                                     <h1>Paiement déjà effectué !</h1>
                                                     <p>
                                                         Your checkout was successful, we have sent the
                                                         order detail to your email <b>{order.email}</b>
                                                         <hr />
                                                         <small>Gardez bien votre id de commande <b> {order.oid}</b> pour le suivi et d'éventuelles réclamations</small>
                                                     </p>
                                                     <button
                                                         className="btn btn-success mt-3"
                                                         data-bs-toggle="modal"
                                                         data-bs-target="#exampleModal"
                                                     >
                                                         View Order <i className="fas fa-eye" />{" "}
                                                     </button>
                                                     <a
                                                         href="/"
                                                         className="btn btn-primary mt-3 ms-2"
                                                     >
                                                         Download Invoice{" "}
                                                         <i className="fas fa-file-invoice" />{" "}
                                                     </a>
                                                     <a
                                                         className="btn btn-secondary mt-3 ms-2"
                                                     >
                                                         Go Home <i className="fas fa-arrow-left" />{" "}
                                                     </a>
                                                 </div>
                                             </div>
                                         </div>
                                           }
                                           {status === 'paiement effectué' && 
                                             <div className="col-lg-12">
                                             <div className="border border-3 border-success" />
                                             <div className="card bg-white shadow p-5">
                                                 <div className="mb-4 text-center">
                                                     <i
                                                         className="fas fa-check-circle text-success"
                                                         style={{ fontSize: 100, color: "green" }}
                                                     />
                                                 </div>
                                                 <div className="text-center">
                                                     <h1>Thank You !</h1>
                                                     <p>
                                                         Your checkout was successful, we have sent the
                                                         order detail to your email <b>{order.email}</b>
                                                         <hr />
                                                         <small>Gardez bien votre id de commande <b> {order.oid}</b> pour le suivi et d'éventuelles réclamations</small>
                                                     </p>
                                                     <button
                                                         className="btn btn-success mt-3"
                                                         data-bs-toggle="modal"
                                                         data-bs-target="#exampleModal"
                                                     >
                                                         View Order <i className="fas fa-eye" />{" "}
                                                     </button>
                                                     <a
                                                         href="/"
                                                         className="btn btn-primary mt-3 ms-2"
                                                     >
                                                         Download Invoice{" "}
                                                         <i className="fas fa-file-invoice" />{" "}
                                                     </a>
                                                     <a
                                                         className="btn btn-secondary mt-3 ms-2"
                                                     >
                                                         Go Home <i className="fas fa-arrow-left" />{" "}
                                                     </a>
                                                 </div>
                                             </div>
                                         </div>
                                           }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            <div
                className="modal fade"
                id="exampleModal"
                tabIndex={-1}
                aria-labelledby="exampleModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="exampleModalLabel">
                                Order Summary
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body text-start text-black p-4">
                            <h5 className="modal-title text-uppercase " id="exampleModalLabel">
                                {order.full_name}
                            </h5>
                            <h6>{order.email}</h6>
                            <h6>{order.mobile}</h6>
                            <h6 className="mb-5">{order.address} - {order.city} <br />  {order.state} - {order.country} </h6>
                            <p className="mb-0" style={{ color: "#35558a" }}>
                                Payment summary
                            </p>
                            <hr
                                className="mt-2 mb-4"
                                style={{
                                    height: 0,
                                    backgroundColor: "transparent",
                                    opacity: ".75",
                                    borderTop: "2px dashed #9e9e9e"
                                }}
                            />
                            {order.orderitem?.map ((o, index) =>(
                                 <div className="d-flex justify-content-between shadow p-2 rounded-2 mb-2">
                                 <p className="fw-bold mb-0">{o.product?.title}</p>
                                 <p className="text-muted mb-0">${o.price} * {o.qty} </p>
                             </div>
                            ))}
                            <div className="d-flex justify-content-between">
                                <p className="fw-bold mb-0">Subtotal</p>
                                <p className="text-muted mb-0">${order.sub_total}</p>
                            </div>
                            <div className="d-flex justify-content-between">
                                <p className="small mb-0">Shipping Fee</p>
                                <p className="small mb-0">${order.shipping_amount}</p>
                            </div>
                            <div className="d-flex justify-content-between">
                                <p className="small mb-0">Service Fee</p>
                                <p className="small mb-0">${order.service_fee}</p>
                            </div>
                            <div className="d-flex justify-content-between">
                                <p className="small mb-0">Tax</p>
                                <p className="small mb-0">${order.tax_fee}</p>
                            </div>
                            <div className="d-flex justify-content-between">
                                <p className="small mb-0">Discount</p>
                                <p className="small mb-0">-${order.saved}</p>
                            </div>
                            <div className="d-flex justify-content-between mt-4">
                                <p className="fw-bold">Total</p>
                                <p className="fw-bold" style={{ color: "#35558a" }}>
                                    ${order.total}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default PaymentSuccess;
