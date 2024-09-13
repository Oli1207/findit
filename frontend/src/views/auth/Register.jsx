import React,{useState, useEffect} from 'react';
import { register } from '../../utils/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';


function Register() {
  const [full_name, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setMobile] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
    

  useEffect(() => {
    if(isLoggedIn()){
      navigate("/")
    }
  },[])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const {error} = await register(
      full_name,
      email,
      phone,
      password,
      password2,
    )
    if(error){
      alert(JSON.stringify(error))
    }else{
      navigate('/')
    }
  }

  return (
    <>
      <div>Register</div>
      <form onSubmit={handleSubmit}>
        <input 
        type='text'
        placeholder='Nom et prénoms' 
        name='' 
        id=''
        onChange={(e) => setFullname(e.target.value)}
        />
        <br/>
        <br />
        <input 
        type='email'
        placeholder='Email' 
        name='' 
        id=''
        onChange={(e) => setEmail(e.target.value)}
        />
        <br/>
        <br/>
        <input 
        type='number'
        placeholder='Numéro ' 
        name='' 
        id=''
        onChange={(e) => setMobile(e.target.value)}
        />
        <br/>
        <br/>
        <input 
        type='password'
        placeholder='Mot de passe' 
        name='' 
        id=''
        onChange={(e) => setPassword(e.target.value)}
        />
        <br/>
        <br/>
        <input 
        type='password'
        placeholder='Confirmez votre mot de passe' 
        name='' 
        id=''
        onChange={(e) => setPassword2(e.target.value)}
        />
        <br />
        <br />
        <button type='submit'>Créer un compte</button>
      </form>
    </>
  )
}

export default Register