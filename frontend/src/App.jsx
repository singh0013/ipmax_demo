import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar }             from './components/Sidebar'
import { PurchaseBanner }      from './components/PurchaseBanner'
import { Login }               from './pages/Login'
import { Dashboard }           from './pages/Dashboard'
import { Subnets }             from './pages/Subnets'
import { IPAddresses }         from './pages/IPAddresses'
import { AuditLog }            from './pages/AuditLog'
import { ImportPage }          from './pages/ImportPage'
import { Users }               from './pages/Users'
import { ActivityLogPage }     from './pages/ActivityLog'
import { DiscoveryPill }       from './pages/Discovery'
import { ChangePasswordModal } from './pages/ChangePassword'
import { DeviceInventory }     from './pages/DeviceInventory'
import { SchedulesPage }       from './pages/Tasks'
import { SupportPage }         from './pages/Support'
import { auth }                from './api/client'

export default function App() {
  const [user, setUser]               = useState(auth.getUser())
  const [token, setToken]             = useState(auth.getToken())
  const [showChangePwd, setChangePwd] = useState(false)
  const [showPurchase, setPurchase]   = useState(false)

  // Global 402 handler — triggered by client.js interceptor
  useEffect(() => {
    const handler = () => setPurchase(true)
    window.addEventListener('purchase_required', handler)
    return () => window.removeEventListener('purchase_required', handler)
  }, [])

  const handleLogin = (data) => {
    auth.setSession(data)
    setToken(data.access_token)
    setUser({ username: data.username, role: data.role })
    if (data.must_change_password) setChangePwd(true)
  }

  const handleLogout = () => {
    auth.clear()
    setUser(null)
    setToken(null)
  }

  if (!user || !token) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#161b25', border: '1px solid #1e2736', color: '#e2e8f0', fontSize: '14px' },
        }} />
      </>
    )
  }

  const isAdmin = user.role === 'admin'

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 ml-56 p-8 min-h-screen">
          <div className="max-w-5xl mx-auto">
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/subnets"  element={<Subnets />} />
              <Route path="/ips"      element={<IPAddresses />} />
              <Route path="/audit"    element={<AuditLog />} />
              <Route path="/import"   element={<ImportPage />} />
              <Route path="/activity" element={<ActivityLogPage />} />
              <Route path="/devices"   element={isAdmin ? <DeviceInventory /> : <Navigate to="/" replace />} />
              <Route path="/schedules" element={isAdmin ? <SchedulesPage />   : <Navigate to="/" replace />} />
              <Route path="/support"   element={isAdmin ? <SupportPage />     : <Navigate to="/" replace />} />
              <Route path="/users"     element={isAdmin ? <Users />           : <Navigate to="/" replace />} />
              <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onDone={() => setChangePwd(false)} />}
      {showPurchase  && <PurchaseBanner onClose={() => setPurchase(false)} />}
      <DiscoveryPill />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#161b25', border: '1px solid #1e2736', color: '#e2e8f0', fontSize: '14px' },
          success: { iconTheme: { primary: '#17b584', secondary: '#0f1117' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0f1117' } },
        }}
      />
    </BrowserRouter>
  )
}
