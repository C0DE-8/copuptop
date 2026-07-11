import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiDownload,
  FiImage,
  FiPrinter,
  FiRefreshCw,
  FiShare2,
  FiUser,
} from 'react-icons/fi'
import { FaArrowDown, FaArrowUp, FaGift, FaMobileAlt, FaPercent, FaPiggyBank, FaStore } from 'react-icons/fa'
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

const formatReceiptDate = (value) =>
  new Date(value || Date.now()).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

const formatMonth = (value) =>
  new Date(value || Date.now()).toLocaleString(undefined, { month: 'short', year: 'numeric' })

const compactName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()

const maskAccount = (value) => {
  const text = String(value || '').replace(/\D/g, '')

  if (text.length < 6) {
    return text
  }

  return `${text.slice(0, 3)}****${text.slice(-3)}`
}

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('copup_user') || 'null')
  } catch {
    return null
  }
}

const getCounterpartyName = (item) => {
  const bankName = compactName(item.bankAccountName)
  const walletName = compactName(`${item.counterpartyFirstName || ''} ${item.counterpartyLastName || ''}`)

  if (bankName) {
    return bankName
  }

  if (walletName) {
    return walletName
  }

  const description = String(item.description || '')
  const match = description.match(/transfer\s+(?:to|from)\s+(.+)/i)

  if (match?.[1]) {
    return compactName(match[1])
  }

  return ''
}

const getPaymentLabel = (item) => {
  if (item.bankAccountName || item.bankAccountNumber) {
    return 'Opay'
  }

  if (item.description?.toLowerCase().includes('wealth')) {
    return 'OWealth'
  }

  return 'Opay'
}

const getTransactionTitle = (item) => {
  const description = String(item.description || '').trim()
  const descriptionLower = description.toLowerCase()
  const counterpartyName = getCounterpartyName(item)

  if (counterpartyName && (item.bankAccountName || item.counterpartyFirstName || descriptionLower.includes('transfer'))) {
    return `Transfer ${item.entryType === 'credit' ? 'from' : 'to'} ${counterpartyName}`
  }

  if (descriptionLower.includes('airtime')) return 'Airtime'
  if (descriptionLower.includes('bonus')) return 'Bonus from Airtime Purchase'
  if (descriptionLower.includes('safebox') && descriptionLower.includes('withdraw')) return 'SafeBox Withdrawal'
  if (descriptionLower.includes('safebox')) return 'SafeBox Deposit'
  if (descriptionLower.includes('interest')) return description || 'OWealth Interest Earned'
  if (descriptionLower.includes('deposit')) return description || 'Spend & Save Deposit'

  return description || (item.entryType === 'credit' ? 'Transfer from Opay account' : 'Transfer to Opay account')
}

const getPartyDetails = (item) => {
  const counterpartyName = getCounterpartyName(item)
  const paymentLabel = getPaymentLabel(item)
  const account = item.bankAccountNumber || item.counterpartyPhone || item.counterpartyEmail || ''
  const masked = maskAccount(account)

  if (!counterpartyName) {
    return item.description || 'Opay'
  }

  return masked ? `${counterpartyName}\n${paymentLabel} | ${masked}` : `${counterpartyName}\n${paymentLabel}`
}

const getReceiptParties = (item) => {
  const user = readStoredUser()
  const userName = compactName(`${user?.firstName || ''} ${user?.lastName || ''}`) || 'OPAY USER'
  const userPhone = user?.phone || user?.email || ''
  const userDetails = maskAccount(userPhone) ? `OPay | ${maskAccount(userPhone)}` : 'OPay'
  const counterpartyName = getCounterpartyName(item) || compactName(item.description) || 'OPAY'
  const counterpartyAccount = item.bankAccountNumber || item.counterpartyPhone || item.counterpartyEmail || ''
  const counterpartyDetails = maskAccount(counterpartyAccount) ? `OPay | ${maskAccount(counterpartyAccount)}` : getPaymentLabel(item)

  if (item.entryType === 'credit') {
    return {
      recipientName: userName,
      recipientDetails: userDetails,
      senderName: counterpartyName,
      senderDetails: counterpartyDetails,
    }
  }

  return {
    recipientName: counterpartyName,
    recipientDetails: counterpartyDetails,
    senderName: userName,
    senderDetails: userDetails,
  }
}

const TransactionIcon = ({ item }) => {
  const description = (item.description || '').toLowerCase()

  if (description.includes('airtime')) return <FaMobileAlt />
  if (description.includes('bonus')) return <FaGift />
  if (description.includes('interest') || description.includes('wealth')) return <FaPercent />
  if (description.includes('safe') || description.includes('save')) return <FaPiggyBank />
  if (item.bankAccountName || description.includes('transfer')) return item.entryType === 'credit' ? <FaArrowDown /> : <FaArrowUp />
  return <FaStore />
}

const Transactions = () => {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState(null)
  const [ledger, setLedger] = useState([])
  const [error, setError] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
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
    const partyDetails = getPartyDetails(selectedTransaction)
    const isTransfer = title.toLowerCase().startsWith('transfer')
    const receiptParties = getReceiptParties(selectedTransaction)

    if (showReceipt) {
      return (
        <section className={styles.receiptPage}>
          <header className={styles.receiptTopbar}>
            <button type="button" onClick={() => setShowReceipt(false)} aria-label="Back to transaction details">
              <FiArrowLeft />
            </button>
            <h1>Share Receipt</h1>
            <span />
          </header>

          <article className={styles.receiptCard}>
            <div className={styles.receiptHeader}>
              <div className={styles.receiptLogo}>
                <span />
                <strong>Pay</strong>
              </div>
              <p>Transaction Receipt</p>
            </div>

            <div className={styles.receiptStatus}>
              <strong>{amount}</strong>
              <span>{selectedTransaction.status || 'Successful'}</span>
              <time>{formatReceiptDate(selectedTransaction.createdAt)}</time>
            </div>

            <div className={styles.receiptRows}>
              <div>
                <span>Recipient Details</span>
                <strong>
                  {receiptParties.recipientName}
                  <small>{receiptParties.recipientDetails}</small>
                </strong>
              </div>
              <div>
                <span>Sender Details</span>
                <strong>
                  {receiptParties.senderName}
                  <small>{receiptParties.senderDetails}</small>
                </strong>
              </div>
              <div>
                <span>Transaction No.</span>
                <strong>{selectedTransaction.reference || '260710010100435781471369'}</strong>
              </div>
            </div>

            <p className={styles.receiptNote}>
              Enjoy a better life with OPay. Get free transfers, withdrawals, bill payments, instant loans, and good annual
              interest On your savings. OPay is licensed by the Central Bank of Nigeria and insured by the NDIC.
            </p>
          </article>

          <footer className={styles.receiptActions}>
            <button type="button">
              <FiImage /> Share as image
            </button>
            <button type="button">
              <FiPrinter /> Share as PDF
            </button>
          </footer>
        </section>
      )
    }

    return (
      <section className={styles.page}>
        <header className={styles.topbar}>
          <button
            type="button"
            onClick={() => {
              setShowReceipt(false)
              setSelectedTransaction(null)
            }}
            aria-label="Back to transactions"
          >
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
              <dd>{isCredit ? 'Available Balance' : partyDetails}</dd>
            </div>
            {isCredit ? (
              <div>
                <dt>Sender Details</dt>
                <dd>{partyDetails}</dd>
              </div>
            ) : (
              <div>
                <dt>Remark</dt>
                <dd>{selectedTransaction.bankNarration || selectedTransaction.description || 'Purchase'}</dd>
              </div>
            )}
            <div>
              <dt>Transaction No.</dt>
              <dd>
                {selectedTransaction.reference || '260526010100733266924555'}
                <FiCopy />
              </dd>
            </div>
            <div>
              <dt>{isCredit ? 'Transaction Date' : 'Payment Method'}</dt>
              <dd>{isCredit ? formatDate(selectedTransaction.createdAt) : getPaymentLabel(selectedTransaction)}</dd>
            </div>
            {!isCredit && (
              <div>
                <dt>Transaction Date</dt>
                <dd>{formatDate(selectedTransaction.createdAt)}</dd>
              </div>
            )}
            {!isTransfer && (
              <div>
                <dt>Transaction Type</dt>
                <dd>{isCredit ? 'Deposit' : 'Debit'}</dd>
              </div>
            )}
            {isCredit && !isTransfer && (
              <div>
                <dt>Session ID</dt>
                <dd>
                  {(selectedTransaction.reference || '090267260526221139373004507015').slice(0, 30)}
                  <FiCopy />
                </dd>
              </div>
            )}
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
            <button type="button">
              <FiDownload /> View Records
            </button>
          </div>
        </section>

        <div className={styles.detailFooter}>
          {!isCredit && <button type="button">Report Issue</button>}
          <button type="button" onClick={() => setShowReceipt(true)}>
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
                onClick={() => {
                  setShowReceipt(false)
                  setSelectedTransaction(item)
                }}
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
