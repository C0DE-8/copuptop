import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronRight, FiEye, FiEyeOff, FiPlus, FiShield } from 'react-icons/fi'
import {
  FaBell,
  FaChartBar,
  FaDice,
  FaExpand,
  FaGift,
  FaHandHoldingUsd,
  FaMobileAlt,
  FaPiggyBank,
  FaRegCommentDots,
  FaShieldAlt,
  FaStore,
  FaThLarge,
  FaTv,
  FaUniversity,
  FaWallet,
} from 'react-icons/fa'
import { getUserProfile } from '../../api/auth.api'
import { getBalance } from '../../api/wallet.api'
import { getTransactions } from '../../api/transaction.api'
import styles from './dashboard.module.css'

const services = [
  { label: 'Airtime', icon: FaChartBar, badge: 'Up to 6%' },
  { label: 'Data', icon: FaMobileAlt },
  { label: 'Betting', icon: FaDice },
  { label: 'TV', icon: FaTv },
  { label: 'SafeBox', icon: FaPiggyBank },
  { label: 'Loan', icon: FaHandHoldingUsd },
  { label: 'BizPayment', icon: FaStore },
  { label: 'More', icon: FaThLarge },
]

const moneyActions = [
  { label: 'To OPay', icon: FaRegCommentDots, to: '/wallet' },
  { label: 'To Bank', icon: FaUniversity, to: '/bank' },
  { label: 'Withdraw', icon: FaWallet, to: '/bank' },
]

const Dashboard = () => {
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')
  const [balanceVisible, setBalanceVisible] = useState(true)

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

  const firstName = profile?.firstName || 'Opay'
  const lastName = profile?.lastName || 'customer'
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const currency = wallet?.currency === 'NGN' ? '₦' : wallet?.currency || '₦'
  const balance = Number(wallet?.balance || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const recentTransactions = transactions.slice(0, 2)

  return (
    <section className={styles.page}>
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

      {error && <p className={styles.error}>{error}</p>}

      <article className={styles.balanceCard}>
        <div className={styles.balanceTop}>
          <p>
            <FiShield />
            Available Balance
            <button
              className={styles.eyeButton}
              type="button"
              onClick={() => setBalanceVisible((current) => !current)}
              aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
            >
              {balanceVisible ? <FiEye /> : <FiEyeOff />}
            </button>
          </p>
          <Link to="/transactions">
            Transaction History <FiChevronRight />
          </Link>
        </div>
        <div className={styles.balanceBottom}>
          <button
            className={styles.balanceAmount}
            type="button"
            onClick={() => setBalanceVisible((current) => !current)}
            aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
          >
            <strong>{balanceVisible ? `${currency}${balance}` : '****'}</strong>
            <FiChevronRight />
          </button>
          <Link className={styles.addMoney} to="/wallet">
            <FiPlus /> Add Money
          </Link>
        </div>
      </article>

      {balanceVisible && (
        <section className={styles.activityCard} aria-label="Recent wallet activity">
          {recentTransactions.map((item) => {
            const isCredit = item.entryType === 'credit'

            return (
              <div className={styles.activityRow} key={item.reference}>
                <div className={styles.percentIcon} aria-hidden="true">
                  %
                </div>
                <div>
                  <strong>{item.description || (isCredit ? 'Wallet Credit' : 'Wallet Debit')}</strong>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.reference}</span>
                </div>
                <p className={isCredit ? styles.credit : styles.debit}>
                  {isCredit ? '+' : '-'}
                  {item.currency === 'NGN' ? '₦' : item.currency}
                  {Number(item.amount).toLocaleString()}
                  <span>{item.status || 'Successful'}</span>
                </p>
              </div>
            )
          })}
          {recentTransactions.length === 0 && <p className={styles.empty}>No wallet activity yet.</p>}
        </section>
      )}

      <section className={styles.quickActions} aria-label="Money actions">
        {moneyActions.map((item) => {
          const Icon = item.icon

          return (
            <Link to={item.to} key={item.label}>
              <span>
                <Icon />
              </span>
              {item.label}
            </Link>
          )
        })}
      </section>

      <section className={styles.serviceGrid} aria-label="Services">
        {services.map((item) => {
          const Icon = item.icon

          return (
            <button type="button" key={item.label}>
              {item.badge && <em>{item.badge}</em>}
              <span>
                <Icon />
              </span>
              {item.label}
            </button>
          )
        })}
      </section>

      <section className={styles.promo}>
        <FaGift />
        <div>
          <strong>Cash up for grabs!</strong>
          <span>Invite friends and earn up to ₦5,600 Bonus</span>
        </div>
        <div className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <button className={styles.security} type="button">
        <FaShieldAlt />
        <span>Click for Security</span>
      </button>
    </section>
  )
}

export default Dashboard
