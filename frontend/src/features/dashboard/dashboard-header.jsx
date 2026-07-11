import { FaBell, FaExpand, FaGift } from 'react-icons/fa'
import styles from './dashboard-header.module.css'

const DashboardHeader = ({ firstName, lastName, initials }) => (
  <header className={styles.header}>
    <div className={styles.greeting}>
      <div className={styles.avatar} aria-hidden="true">
        {initials}
        <span>3</span>
      </div>
      <h1>
        Hi, {firstName} <span>{lastName}</span>
      </h1>
    </div>
    <div className={styles.headerActions} aria-label="Dashboard tools">
      <button type="button" aria-label="Help">
        <FaGift />
        <span>HELP</span>
      </button>
      <button type="button" aria-label="Scan">
        <FaExpand />
      </button>
      <button type="button" aria-label="Notifications">
        <FaBell />
        <strong>99+</strong>
      </button>
    </div>
  </header>
)

export default DashboardHeader
