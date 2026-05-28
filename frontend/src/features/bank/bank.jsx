import { useState } from 'react'
import { transferToBank } from '../../api/bank.api'
import styles from './bank.module.css'

const Bank = () => {
  const [form, setForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
    amount: '',
    narration: '',
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const response = await transferToBank({
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        amount: Number(form.amount),
        narration: form.narration || 'Copup Bank transfer',
      })
      setResult(response.data)
      setForm({
        bankCode: '',
        accountNumber: '',
        accountName: '',
        amount: '',
        narration: '',
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit bank transfer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>Bank transfer</p>
        <h1>Send money to an external bank account</h1>
      </header>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Bank code
            <input name="bankCode" value={form.bankCode} onChange={handleChange} required />
          </label>

          <label>
            Account number
            <input name="accountNumber" value={form.accountNumber} onChange={handleChange} required />
          </label>

          <label>
            Account name
            <input name="accountName" value={form.accountName} onChange={handleChange} />
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
            Narration
            <input name="narration" value={form.narration} onChange={handleChange} />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {result && (
            <p className={styles.success}>
              Transfer submitted with reference {result.reference}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit transfer'}
          </button>
        </form>

        <aside className={styles.panel}>
          <p>Transfer controls</p>
          <h2>Every payout is debited, logged, and tracked by reference.</h2>
          <ul>
            <li>Wallet balance is never supplied by the browser.</li>
            <li>Failed transfer initiation is reversed by the backend.</li>
            <li>Retry tracking stays tied to the original transfer.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default Bank
