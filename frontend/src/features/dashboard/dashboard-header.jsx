import { Link } from 'react-router-dom'
import { FaBell, FaExpand, FaGift } from 'react-icons/fa'
import styles from './dashboard-header.module.css'

const DashboardHeader = ({ firstName, lastName, initials }) => (
  <header className={styles.header}>
    <Link className={styles.greeting} to="/me" aria-label="Open profile">
      <div className={styles.avatar} aria-hidden="true">
        {initials}
        <span>3</span>
      </div>
      <h1>
        Hi, {firstName} <span>{lastName}</span>
      </h1>
    </Link>
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
