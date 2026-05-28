import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './features/auth/login'
import Register from './features/auth/register'
import Dashboard from './features/dashboard/dashboard'
import Wallet from './features/wallet/wallet'
import Bank from './features/bank/bank'
import AppShell from './components/app-shell'
import ProtectedRoute, { isAuthenticated } from './routes/protected-route'

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
