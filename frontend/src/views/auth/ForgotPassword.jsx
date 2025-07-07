import React, { useState } from 'react'
import apiInstance from '../../utils/axios'

function ForgotPassword() {
    
    const [email, setEmail] = useState("")

    const handleSubmit = () => {

        console.log(email)
        apiInstance.get(`user/password-reset/${email}`).then((res) => {
            
        })
    }
  return (
    <div>
        <h1>Forgot Password</h1>
        <input 
        onChange={(e) => setEmail(e.target.value)} type="text" placeholder='Enter Email' name='' id='' />
        <br />
        <button onClick={handleSubmit}>Reset Password</button>
    </div>
  )
}

export default ForgotPassword