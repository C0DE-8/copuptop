import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Login from './features/auth/login'
import Register from './features/auth/register'
import Dashboard from './features/dashboard/dashboard'
import Wallet from './features/wallet/wallet'
import Bank from './features/bank/bank'
import styles from './App.module.css'

const isAuthenticated = () => Boolean(localStorage.getItem('copup_access_token'))

const ProtectedRoute = () => {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}

const AppShell = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('copup_access_token')
    localStorage.removeItem('copup_refresh_token')
    localStorage.removeItem('copup_user')
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} to="/dashboard">
          <span>CB</span>
          <strong>Copup Bank</strong>
        </Link>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/wallet">Wallet</Link>
          <Link to="/bank">Bank</Link>
        </nav>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

const App = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/bank" element={<Bank />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/'} replace />} />
  </Routes>
)

export default App
