import { AuthButton } from '../components/AuthButton'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
        <h1 className="text-5xl font-bold text-blue-600 mb-3">
          Jimo market
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Automate local trading with AI agents
        </p>
        <AuthButton />
      </div>
    </div>
  )
}
