import { useEffect, useState } from 'react'
import { transferToUser } from '../../api/bank.api'
import { getWallet } from '../../api/wallet.api'
import { getTransactions } from '../../api/transaction.api'
import styles from './wallet.module.css'

const formatTransactionReference = (value) => String(value || '').replace(/\D/g, '') || value

const Wallet = () => {
  const [wallet, setWallet] = useState(null)
  const [ledger, setLedger] = useState([])
  const [form, setForm] = useState({ recipientEmail: '', amount: '', description: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const refreshWallet = async () => {
    const [walletResult, ledgerResult] = await Promise.all([getWallet(), getTransactions()])
    setWallet(walletResult.data.wallet)
    setLedger(ledgerResult.data.ledger || [])
  }

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
          setError(err.response?.data?.message || 'Unable to load wallet')
        }
      }
    }

    loadWallet()

    return () => {
      active = false
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await transferToUser({
        recipientEmail: form.recipientEmail,
        amount: Number(form.amount),
        description: form.description || 'Wallet transfer',
      })
      setMessage('Transfer completed')
      setForm({ recipientEmail: '', amount: '', description: '' })
      await refreshWallet()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to transfer funds')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Wallet</p>
          <h1>Move money between Opay accounts</h1>
        </div>
        <strong>
          {wallet?.currency || 'NGN'} {Number(wallet?.balance || 0).toLocaleString()}
        </strong>
      </header>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2>Transfer to user</h2>
          <label>
            Recipient email
            <input
              name="recipientEmail"
              type="email"
              value={form.recipientEmail}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Description
            <input name="description" value={form.description} onChange={handleChange} />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send transfer'}
          </button>
        </form>

        <section className={styles.ledger}>
          <h2>Ledger</h2>
          {ledger.map((item) => (
            <div className={styles.row} key={item.reference}>
              <div>
                <strong>{item.description || item.entryType}</strong>
                <span>{formatTransactionReference(item.reference)}</span>
              </div>
              <p className={item.entryType === 'credit' ? styles.credit : styles.debit}>
                {item.entryType === 'credit' ? '+' : '-'}
                {item.currency} {Number(item.amount).toLocaleString()}
              </p>
            </div>
          ))}
          {ledger.length === 0 && <p className={styles.empty}>No wallet activity yet.</p>}
        </section>
      </div>
    </section>
  )
}

export default Wallet
