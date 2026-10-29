import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthForm } from './pages/AuthForm'
import { Sessions } from './pages/Sessions'
import './App.css'
import { Interview } from './pages/Interview'
import { DemoPage } from './pages/DemoPage'

function RequireLogin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          {/* Public: no RequireLogin, and the page makes no API calls */}
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/interview/:sessionId" element={
             <RequireLogin>
               <Interview />
             </RequireLogin>
          } />
          <Route
            path="/"
            element={
              <RequireLogin>
                <Sessions />
              </RequireLogin>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
