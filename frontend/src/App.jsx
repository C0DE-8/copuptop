import { Component, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './features/auth/login'
import Register from './features/auth/register'
import Dashboard from './features/dashboard/dashboard'
import Wallet from './features/wallet/wallet'
import Transactions from './features/transactions/transactions'
import Bank from './features/bank/bank'
import Me from './features/me/me'
import AppShell from './components/app-shell'
import ProtectedRoute from './routes/protected-route'
import { isAuthenticated } from './routes/auth-session'
import logo from './assets/logo.png'
import splash from './assets/splash.jpg'

const OpeningSplash = () => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1400)

    return () => window.clearTimeout(timeout)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div className="openingSplash" aria-label="Opening Opay">
      <img className="openingSplashBackground" src={splash} alt="" />
      <div className="openingSplashContent">
        <img src={logo} alt="Opay" />
        <p>Opay</p>
        <span>Beyond banking</span>
      </div>
    </div>
  )
}

const OfflineSplash = () => {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (online) {
    return null
  }

  return (
    <div className="offlineSplash" role="status" aria-live="polite">
      <img className="openingSplashBackground" src={splash} alt="" />
      <div className="openingSplashContent">
        <img src={logo} alt="Opay" />
        <p>Connection unavailable</p>
        <span>Opay will continue when your network returns</span>
      </div>
    </div>
  )
}

class AppFallback extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="appFallback">
          <img src={logo} alt="Opay" />
          <h1>Opay is starting again</h1>
          <p>Refresh the app to continue banking.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Refresh app
          </button>
        </main>
      )
    }

    return this.props.children
  }
}

const App = () => (
  <AppFallback>
    <OpeningSplash />
    <OfflineSplash />
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/me" element={<Me />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/'} replace />} />
    </Routes>
  </AppFallback>
)

export default App
