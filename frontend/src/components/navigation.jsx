import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiCreditCard, FiHome, FiMinusCircle, FiPieChart, FiUser } from 'react-icons/fi'
import { RiCopperCoinLine } from 'react-icons/ri'
import styles from './navigation.module.css'

const navItems = [
  { label: 'Home', to: '/dashboard', icon: FiHome, active: true },
  { label: 'Rewards', to: '/wallet', icon: RiCopperCoinLine, active: true },
  { label: 'Finance', to: '/bank', icon: FiPieChart, active: true },
  { label: 'Cards', to: '/wallet', icon: FiCreditCard, active: false },
  { label: 'Me', to: '/dashboard', icon: FiUser, active: false },
]

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
      <div className={styles.mobileNav}>
        {navItems.map((item) => {
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
      </div>
    </aside>
  )
}

export default Navigation
