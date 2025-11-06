import { useNavigate } from 'react-router-dom'
import { PrivateKeySave } from '../components/PrivateKeySave'
import { useAuth } from '../contexts/AuthContext'

export function PrivateKeySavePage() {
  const navigate = useNavigate()
  const { user, privateKey, clearPrivateKey } = useAuth()

  const handleComplete = () => {
    clearPrivateKey()
    navigate('/')
  }

  if (!privateKey || !user?.did) {
    // Redirect to home if no private key to save
    navigate('/')
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
