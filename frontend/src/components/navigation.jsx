import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiMinusCircle } from 'react-icons/fi'
import logo from '../assets/logo.png'
import BottomNavigation from './bottom-navigation'
import { navItems } from './nav-items'
import styles from './navigation.module.css'

const Navigation = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('copup_access_token')
    localStorage.removeItem('copup_refresh_token')
    navigate('/', { replace: true })
  }

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} to="/dashboard">
        <img src={logo} alt="Opay" />
        <strong>Opay</strong>
      </Link>
      <nav>
        {navItems.slice(0, 3).map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              className={({ isActive }) => (isActive && item.active ? styles.active : undefined)}
              to={item.to}
              key={item.label}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <button type="button" onClick={handleLogout}>
        <FiMinusCircle />
        Logout
      </button>
      <BottomNavigation />
    </aside>
  )
}

export default Navigation
