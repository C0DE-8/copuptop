import { Link, useNavigate } from 'react-router-dom'
import styles from './navigation.module.css'

const Navigation = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('copup_access_token')
    localStorage.removeItem('copup_refresh_token')
    localStorage.removeItem('copup_user')
    navigate('/', { replace: true })
  }

  return (
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
  )
}

export default Navigation
