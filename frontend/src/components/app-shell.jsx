import { Outlet } from 'react-router-dom'
import Navigation from './navigation'
import styles from './app-shell.module.css'

const AppShell = () => (
  <div className={styles.shell}>
    <Navigation />
    <main className={styles.content}>
      <Outlet />
    </main>
  </div>
)

export default AppShell
