import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { PrivateKeySavePage } from './pages/PrivateKeySavePage'
import { AgentDetailPage } from './pages/AgentDetailPage'
import { Layout } from './components/layout/Layout'
import { PrivateRoute } from './components/layout/PrivateRoute'

function App() {
  const { isAuthenticated, isInitializing, user, privateKey } = useAuth()

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - Landing page */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              // Check if user needs to save private key
              privateKey && user?.did ? (
                <Navigate to="/save-private-key" replace />
              ) : (
                <Navigate to="/home" replace />
              )
            ) : (
              <LandingPage />
            )
          } 
        />

        {/* Private route - Home page */}
        <Route 
          path="/home" 
          element={
            <PrivateRoute>
              <Layout>
                <HomePage />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Private route - Save private key */}
        <Route 
          path="/save-private-key" 
          element={
            <PrivateRoute>
              <PrivateKeySavePage />
            </PrivateRoute>
          } 
        />

        {/* Private route - Agent detail page */}
        <Route 
          path="/agent/:id" 
          element={
            <PrivateRoute>
              <Layout>
                <AgentDetailPage />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
