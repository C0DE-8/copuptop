import { Navigate, Outlet, useLocation } from 'react-router-dom'

export const isAuthenticated = () => Boolean(localStorage.getItem('copup_access_token'))

const ProtectedRoute = () => {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
