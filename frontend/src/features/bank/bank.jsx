import { useEffect, useMemo, useState } from 'react'
import { getBanks, resolveBankAccount, transferToBank } from '../../api/bank.api'
import styles from './bank.module.css'

const Bank = () => {
  const [banks, setBanks] = useState([])
  const [bankSearch, setBankSearch] = useState('')
  const [form, setForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
    amount: '',
    narration: '',
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [loadingBanks, setLoadingBanks] = useState(true)

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const response = await getBanks('NG')
        setBanks(response.data.banks || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load banks')
      } finally {
        setLoadingBanks(false)
      }
    }

    loadBanks()
  }, [])

  useEffect(() => {
    const shouldResolve = form.bankCode && form.accountNumber.trim().length >= 10

    setForm((current) => ({ ...current, accountName: shouldResolve ? current.accountName : '' }))
    setResolveError('')

    if (!shouldResolve) {
      return undefined
    }

    const timeout = window.setTimeout(async () => {
      setResolving(true)

      try {
        const response = await resolveBankAccount({
          bankCode: form.bankCode,
          accountNumber: form.accountNumber.trim(),
        })

        setForm((current) => ({
          ...current,
          accountName: response.data.account.accountName,
        }))
      } catch (err) {
        setForm((current) => ({ ...current, accountName: '' }))
        setResolveError(err.response?.data?.message || 'Account could not be resolved')
      } finally {
        setResolving(false)
      }
    }, 550)

    return () => window.clearTimeout(timeout)
  }, [form.bankCode, form.accountNumber])

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase()

    if (!query) {
      return banks.slice(0, 40)
    }

    return banks.filter((bank) => bank.name.toLowerCase().includes(query)).slice(0, 40)
  }, [banks, bankSearch])

  const selectedBank = banks.find((bank) => bank.code === form.bankCode)
  const canSubmit = form.bankCode && form.accountNumber && form.accountName && Number(form.amount) > 0

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleBankSelect = (event) => {
    const bankCode = event.target.value
    const bank = banks.find((item) => item.code === bankCode)

    setForm((current) => ({
      ...current,
      bankCode,
      accountName: '',
    }))
    setBankSearch(bank?.name || '')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!canSubmit) {
      setError('Select a bank, enter an account number, and wait for account name confirmation.')
      return
    }

    setLoading(true)

    try {
      const response = await transferToBank({
        bankCode: form.bankCode,
        accountNumber: form.accountNumber.trim(),
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
      setBankSearch('')
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
            Search bank
            <input
              value={bankSearch}
              onChange={(event) => setBankSearch(event.target.value)}
              placeholder={loadingBanks ? 'Loading banks...' : 'Type bank name'}
              disabled={loadingBanks}
            />
          </label>

          <label>
            Bank
            <select value={form.bankCode} onChange={handleBankSelect} required disabled={loadingBanks}>
              <option value="">Select bank</option>
              {filteredBanks.map((bank) => (
                <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Account number
            <input
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              inputMode="numeric"
              maxLength="10"
              required
            />
          </label>

          <div className={styles.resolveBox}>
            <span>Account name</span>
            <strong>
              {resolving
                ? 'Resolving...'
                : form.accountName || (selectedBank ? 'Enter account number' : 'Select bank first')}
            </strong>
            {resolveError && <small>{resolveError}</small>}
          </div>

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

          <button type="submit" disabled={loading || resolving || !canSubmit}>
            {loading ? 'Submitting...' : 'Submit transfer'}
          </button>
        </form>

        <aside className={styles.panel}>
          <p>Transfer controls</p>
          <h2>Pick a bank by name, confirm the account owner, then submit.</h2>
          <ul>
            <li>Bank codes stay hidden behind the API layer.</li>
            <li>Account name is resolved by Flutterwave before transfer.</li>
            <li>Wallet debit and transfer logging still happen only on the backend.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default Bank
