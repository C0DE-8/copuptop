import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiImage, FiPrinter } from 'react-icons/fi'
import { getTransactions } from '../../api/transaction.api'
import {
  findTransactionById,
  formatAmount,
  formatReceiptDate,
  formatTransactionReference,
  getReceiptParties,
} from '../transactions/transaction-helpers'
import styles from './receipt.module.css'

const Receipt = () => {
  const navigate = useNavigate()
  const { transactionId } = useParams()
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadReceipt = async () => {
      try {
        const result = await getTransactions()
        const nextTransaction = findTransactionById(result.data.ledger || [], transactionId)

        if (!active) {
          return
        }

        setTransaction(nextTransaction || null)
        setError(nextTransaction ? '' : 'Receipt not found')
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load receipt')
        }
      }
    }

    loadReceipt()

    return () => {
      active = false
    }
  }, [transactionId])

  if (!transaction) {
    return (
      <section className={styles.receiptPage}>
        <header className={styles.receiptTopbar}>
          <button type="button" onClick={() => navigate('/transactions')} aria-label="Back to transactions">
            <FiArrowLeft />
          </button>
          <h1>Share Receipt</h1>
          <span />
        </header>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    )
  }

  const transactionReference = formatTransactionReference(transaction.reference)
  const amount = formatAmount(transaction).replace('+', '').replace('-', '')
  const receiptParties = getReceiptParties(transaction)

  return (
    <section className={styles.receiptPage}>
      <header className={styles.receiptTopbar}>
        <button type="button" onClick={() => navigate(`/transaction/${transactionReference}`)} aria-label="Back to transaction details">
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
          <span>{transaction.status || 'Successful'}</span>
          <time>{formatReceiptDate(transaction.createdAt)}</time>
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
            <strong>{transactionReference}</strong>
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

export default Receipt
