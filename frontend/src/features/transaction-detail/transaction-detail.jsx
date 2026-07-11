import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiChevronRight, FiCopy, FiDownload, FiRefreshCw, FiShare2, FiUser } from 'react-icons/fi'
import { getTransactions } from '../../api/transaction.api'
import {
  findTransactionById,
  formatAmount,
  formatDate,
  formatTransactionReference,
  getPartyDetails,
  getPaymentLabel,
  getTransactionTitle,
} from '../transactions/transaction-helpers'
import TransactionIcon from '../transactions/transaction-icon'
import styles from './transaction-detail.module.css'

const TransactionDetail = () => {
  const navigate = useNavigate()
  const { transactionId } = useParams()
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadTransaction = async () => {
      try {
        const result = await getTransactions()
        const nextTransaction = findTransactionById(result.data.ledger || [], transactionId)

        if (!active) {
          return
        }

        setTransaction(nextTransaction || null)
        setError(nextTransaction ? '' : 'Transaction not found')
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load transaction')
        }
      }
    }

    loadTransaction()

    return () => {
      active = false
    }
  }, [transactionId])

  if (!transaction) {
    return (
      <section className={styles.page}>
        <header className={styles.topbar}>
          <button type="button" onClick={() => navigate('/transactions')} aria-label="Back to transactions">
            <FiArrowLeft />
          </button>
          <h1>Transaction Details</h1>
          <span />
        </header>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    )
  }

  const isCredit = transaction.entryType === 'credit'
  const title = getTransactionTitle(transaction)
  const amount = formatAmount(transaction).replace('+', '').replace('-', '')
  const partyDetails = getPartyDetails(transaction)
  const isTransfer = title.toLowerCase().startsWith('transfer')
  const selectedTransactionId = formatTransactionReference(transaction.reference)

  return (
    <section className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" onClick={() => navigate('/transactions')} aria-label="Back to transactions">
          <FiArrowLeft />
        </button>
        <h1>Transaction Details</h1>
        <button type="button" aria-label="Support">
          <FiUser />
        </button>
      </header>

      <article className={styles.detailHero}>
        <div className={isCredit ? styles.creditIcon : styles.debitIcon}>
          <TransactionIcon item={transaction} />
        </div>
        <h2>{title}</h2>
        <strong>{amount}</strong>
        <span>
          <FiCheck /> {transaction.status || 'Successful'}
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
              <dd>{transaction.bankNarration || transaction.description || 'Purchase'}</dd>
            </div>
          )}
          <div>
            <dt>Transaction No.</dt>
            <dd>
              {formatTransactionReference(transaction.reference, '260526010100733266924555')}
              <FiCopy />
            </dd>
          </div>
          <div>
            <dt>{isCredit ? 'Transaction Date' : 'Payment Method'}</dt>
            <dd>{isCredit ? formatDate(transaction.createdAt) : getPaymentLabel(transaction)}</dd>
          </div>
          {!isCredit && (
            <div>
              <dt>Transaction Date</dt>
              <dd>{formatDate(transaction.createdAt)}</dd>
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
                {formatTransactionReference(transaction.reference, '090267260526221139373004507015').slice(0, 30)}
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
        <button type="button" onClick={() => navigate(`/receipt/${selectedTransactionId}`)}>
          <FiShare2 /> Share Receipt
        </button>
      </div>
    </section>
  )
}

export default TransactionDetail
