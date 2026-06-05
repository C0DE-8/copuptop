import { NavLink } from 'react-router-dom'
import { navItems } from './nav-items'
import styles from './bottom-navigation.module.css'

const BottomNavigation = () => (
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
)

export default BottomNavigation
