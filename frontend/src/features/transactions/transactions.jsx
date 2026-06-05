import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiDownload,
  FiGift,
  FiHelpCircle,
  FiRefreshCw,
  FiShare2,
  FiShoppingBag,
  FiSmartphone,
  FiUser,
} from 'react-icons/fi'
import { RiHandCoinLine } from 'react-icons/ri'
import { getWallet } from '../../api/wallet.api'
import { getTransactions } from '../../api/transaction.api'
import styles from './transactions.module.css'

const categoryOptions = ['All Categories', 'Deposit', 'Transfer', 'Airtime', 'Interest']
const statusOptions = ['All Status', 'Successful', 'Pending', 'Failed']

const getCurrencySymbol = (currency) => (currency === 'NGN' || !currency ? '₦' : currency)

const formatAmount = (item) => {
  const symbol = getCurrencySymbol(item.currency)
  return `${item.entryType === 'credit' ? '+' : '-'}${symbol}${Number(item.amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatDate = (value) => {
  if (!value) {
    return 'May 29th, 02:15:52'
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatMonth = (value) =>
  new Date(value || Date.now()).toLocaleString(undefined, { month: 'long', year: 'numeric' })

const TransactionIcon = ({ item }) => {
  const description = (item.description || '').toLowerCase()

  if (description.includes('airtime')) return <FiSmartphone />
  if (description.includes('bonus')) return <FiGift />
  if (description.includes('interest')) return <RiHandCoinLine />
  if (description.includes('withdraw')) return <FiArrowRight />
  if (item.entryType === 'credit') return <FiArrowDown />
  return <FiShoppingBag />
}

const getTransactionTitle = (item) => {
  if (item.description) {
    return item.description
  }

  return item.entryType === 'credit' ? 'Transfer from Opay account' : 'Transfer to Opay account'
}

const Transactions = () => {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState(null)
  const [ledger, setLedger] = useState([])
  const [error, setError] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [category, setCategory] = useState(categoryOptions[0])
  const [status, setStatus] = useState(statusOptions[0])

  useEffect(() => {
    let active = true

    const loadWallet = async () => {
      try {
        const [walletResult, ledgerResult] = await Promise.all([getWallet(), getTransactions()])

        if (!active) {
          return
        }

        setWallet(walletResult.data.wallet)
        setLedger(ledgerResult.data.ledger || [])
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load transactions')
        }
      }
    }

    loadWallet()

    return () => {
      active = false
    }
  }, [])

  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      const title = getTransactionTitle(item).toLowerCase()
      const matchesCategory =
        category === 'All Categories' || title.includes(category.toLowerCase()) || item.entryType === category.toLowerCase()
      const matchesStatus = status === 'All Status' || (item.status || 'Successful').toLowerCase() === status.toLowerCase()

      return matchesCategory && matchesStatus
    })
  }, [category, ledger, status])

  const monthTitle = formatMonth(filteredLedger[0]?.createdAt)
  const totalIn = filteredLedger
    .filter((item) => item.entryType === 'credit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalOut = filteredLedger
    .filter((item) => item.entryType !== 'credit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  if (selectedTransaction) {
    const isCredit = selectedTransaction.entryType === 'credit'
    const title = getTransactionTitle(selectedTransaction)
    const amount = formatAmount(selectedTransaction).replace('+', '').replace('-', '')

    return (
      <section className={styles.page}>
        <header className={styles.topbar}>
          <button type="button" onClick={() => setSelectedTransaction(null)} aria-label="Back to transactions">
            <FiArrowLeft />
          </button>
          <h1>Transaction Details</h1>
          <button type="button" aria-label="Support">
            <FiUser />
          </button>
        </header>

        <article className={styles.detailHero}>
          <div className={isCredit ? styles.creditIcon : styles.debitIcon}>
            <TransactionIcon item={selectedTransaction} />
          </div>
          <h2>{title}</h2>
          <strong>{amount}</strong>
          <span>
            <FiCheck /> {selectedTransaction.status || 'Successful'}
          </span>
        </article>

        <section className={styles.detailCard}>
          <h2>Transaction Details</h2>
          <dl>
            <div>
              <dt>{isCredit ? 'Credited to' : 'Recipient Details'}</dt>
              <dd>{isCredit ? 'Available Balance' : 'Opay Wallet'}</dd>
            </div>
            <div>
              <dt>{isCredit ? 'Sender Details' : 'Remark'}</dt>
              <dd>{selectedTransaction.description || 'Wallet transfer'}</dd>
            </div>
            <div>
              <dt>Transaction Type</dt>
              <dd>{isCredit ? 'Bank Deposit' : 'Wallet Transfer'}</dd>
            </div>
            <div>
              <dt>Transaction No.</dt>
              <dd>
                {selectedTransaction.reference || '260526010100733266924555'}
                <FiCopy />
              </dd>
            </div>
            <div>
              <dt>Transaction Date</dt>
              <dd>{formatDate(selectedTransaction.createdAt)}</dd>
            </div>
            <div>
              <dt>Session ID</dt>
              <dd>
                {(selectedTransaction.reference || '090267260526221139373004507015').slice(0, 30)}
                <FiCopy />
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.actionsCard}>
          <h2>More Actions</h2>
          <div className={styles.categoryRow}>
            <span>Category</span>
            <strong>
              {isCredit ? 'Deposit' : 'Transfer'} <FiChevronRight />
            </strong>
          </div>
          <div className={styles.actionLinks}>
            <button type="button">
              <FiRefreshCw /> {isCredit ? 'Transfer Back' : 'Transfer Again'}
            </button>
            {!isCredit && (
              <button type="button">
                <FiDownload /> View Records
              </button>
            )}
          </div>
        </section>

        <div className={styles.detailFooter}>
          {!isCredit && <button type="button">Report Issue</button>}
          <button type="button">
            <FiShare2 /> Share Receipt
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Transactions</h1>
        <button className={styles.downloadButton} type="button">
          Download
        </button>
      </header>

      <div className={styles.filters}>
        <label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FiChevronDown />
        </label>
        <label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FiChevronDown />
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.alertBanner}>
        <div>
          <strong>No transaction alerts?</strong>
          <span>Activate SMS alerts to get instant notifications for every transaction.</span>
          <button type="button">
            Activate Now <FiArrowRight />
          </button>
        </div>
        <FiHelpCircle />
      </section>

      <section className={styles.historyCard}>
        <div className={styles.monthHeader}>
          <div>
            <h2>
              {monthTitle} <FiChevronDown />
            </h2>
            <p>
              In: {getCurrencySymbol(wallet?.currency)}
              {totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span>Out: {getCurrencySymbol(wallet?.currency)}</span>
              {totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button type="button">Analysis</button>
        </div>

        <div className={styles.historyList}>
          {filteredLedger.map((item) => {
            const isCredit = item.entryType === 'credit'

            return (
              <button
                className={styles.historyRow}
                type="button"
                key={item.reference}
                onClick={() => setSelectedTransaction(item)}
              >
                <span className={isCredit ? styles.creditIcon : styles.debitIcon}>
                  <TransactionIcon item={item} />
                </span>
                <span>
                  <strong>{getTransactionTitle(item)}</strong>
                  <em>{formatDate(item.createdAt)}</em>
                </span>
                <span className={isCredit ? styles.creditAmount : styles.debitAmount}>
                  {formatAmount(item)}
                  <em>{item.status || 'Successful'}</em>
                </span>
              </button>
            )
          })}
          {filteredLedger.length === 0 && <p className={styles.empty}>No transactions found.</p>}
        </div>
      </section>
    </section>
  )
}

export default Transactions
