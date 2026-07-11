import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiChevronDown } from 'react-icons/fi'
import { getWallet } from '../../api/wallet.api'
import { getTransactions } from '../../api/transaction.api'
import {
  categoryOptions,
  formatAmount,
  formatDate,
  formatMonth,
  formatTransactionReference,
  getCurrencySymbol,
  getTransactionTitle,
  statusOptions,
} from './transaction-helpers'
import TransactionIcon from './transaction-icon'
import styles from './transactions.module.css'

const Transactions = () => {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState(null)
  const [ledger, setLedger] = useState([])
  const [error, setError] = useState('')
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
                onClick={() => navigate(`/transaction/${formatTransactionReference(item.reference)}`)}
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
