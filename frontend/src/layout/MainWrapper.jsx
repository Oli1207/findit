import { useEffect, useState } from 'react'
import { setUser } from '../utils/auth'
import { AuthGateProvider } from '../context/AuthGateContext'

const MainWrapper = ({ children }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = async () => {
      setLoading(true)
      await setUser()
      setLoading(false)
    }
    handler()
  }, [])

  if (loading) return null

  return (
    <AuthGateProvider>
      {children}
    </AuthGateProvider>
  )
}

export default MainWrapper
