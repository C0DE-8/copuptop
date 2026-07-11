import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from './auth-session'

const ProtectedRoute = () => {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
