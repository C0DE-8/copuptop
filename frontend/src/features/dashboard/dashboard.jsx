import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserProfile } from '../../api/auth.api'
import { getBalance } from '../../api/wallet.api'
import { getTransactions } from '../../api/transaction.api'
import styles from './dashboard.module.css'

const Dashboard = () => {
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profileResult, balanceResult, transactionResult] = await Promise.all([
          getUserProfile(),
          getBalance(),
          getTransactions(),
        ])

        setProfile(profileResult.data.user)
        setWallet(balanceResult.data.wallet)
        setTransactions(transactionResult.data.ledger || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard')
      }
    }

    loadDashboard()
  }, [])

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : 'Copup customer'

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Copup Bank</p>
          <h1>Welcome back, {displayName}</h1>
        </div>
        <nav>
          <Link to="/wallet">Wallet</Link>
          <Link to="/bank">Bank transfer</Link>
        </nav>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <article className={styles.balanceCard}>
          <p>Available balance</p>
          <strong>
            {wallet?.currency || 'NGN'} {Number(wallet?.balance || 0).toLocaleString()}
          </strong>
          <span>Ledger balance: {Number(wallet?.ledgerBalance || 0).toLocaleString()}</span>
        </article>

        <article className={styles.card}>
          <p>Wallet status</p>
          <strong>{wallet?.status || 'Loading'}</strong>
          <span>Balances are read from the backend only.</span>
        </article>

        <article className={styles.card}>
          <p>Recent activity</p>
          <strong>{transactions.length}</strong>
          <span>Latest ledger entries</span>
        </article>
      </div>

      <section className={styles.table}>
        <div className={styles.tableHeader}>
          <h2>Recent ledger</h2>
          <Link to="/wallet">View wallet</Link>
        </div>

        {transactions.slice(0, 6).map((item) => (
          <div className={styles.row} key={item.reference}>
            <span>{item.description || item.entryType}</span>
            <strong className={item.entryType === 'credit' ? styles.credit : styles.debit}>
              {item.entryType === 'credit' ? '+' : '-'}
              {item.currency} {Number(item.amount).toLocaleString()}
            </strong>
          </div>
        ))}

        {transactions.length === 0 && <p className={styles.empty}>No ledger activity yet.</p>}
      </section>
    </section>
  )
}

export default Dashboard
