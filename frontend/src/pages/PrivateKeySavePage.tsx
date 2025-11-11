import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { PrivateKeySave } from '../components/PrivateKeySave'
import { useAuth } from '../contexts/AuthContext'

export function PrivateKeySavePage() {
  const navigate = useNavigate()
  const { user, privateKey, clearPrivateKey } = useAuth()

  const handleComplete = () => {
    clearPrivateKey()
    navigate('/')
  }

  // Redirect to home if no private key to save
  useEffect(() => {
    if (!privateKey || !user?.did) {
      navigate('/')
    }
  }, [privateKey, user?.did, navigate])

  if (!privateKey || !user?.did) {
    return null
  }

  return (
    <PrivateKeySave
      privateKey={privateKey}
      did={user.did}
      onComplete={handleComplete}
    />
  )
}
