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
    const bankCode = form.bankCode
    const accountNumberToResolve = form.accountNumber.trim()
    const shouldResolve = bankCode && accountNumberToResolve.length >= 10

    if (!shouldResolve) {
      return undefined
    }

    let active = true

    const timeout = window.setTimeout(async () => {
      setResolving(true)
      setResolveError('')

      try {
        const response = await resolveBankAccount({
          bankCode,
          accountNumber: accountNumberToResolve,
        })

        if (!active) {
          return
        }

        setForm((current) => ({
          ...current,
          accountName:
            current.bankCode === bankCode && current.accountNumber.trim() === accountNumberToResolve
              ? response.data.account.accountName
              : current.accountName,
        }))
      } catch (err) {
        if (!active) {
          return
        }

        setForm((current) => ({
          ...current,
          accountName:
            current.bankCode === bankCode && current.accountNumber.trim() === accountNumberToResolve
              ? ''
              : current.accountName,
        }))
        setResolveError(err.response?.data?.message || 'Account could not be resolved')
      } finally {
        if (active) {
          setResolving(false)
        }
      }
    }, 550)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [form.bankCode, form.accountNumber])

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase()

    if (!query) {
      return banks.slice(0, 40)
    }

    return banks.filter((bank) => bank.name.toLowerCase().includes(query)).slice(0, 40)
  }, [banks, bankSearch])

  const selectedBank = banks.find((bank) => bank.code === form.bankCode)
  const accountNumber = form.accountNumber.trim()
  const amount = Number(form.amount)
  const canSubmit = form.bankCode && accountNumber.length === 10 && form.accountName && amount > 0

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'accountNumber' ? value.replace(/\D/g, '').slice(0, 10) : value

    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === 'accountNumber' ? { accountName: '' } : {}),
    }))

    if (name === 'accountNumber') {
      setResolveError('')
    }
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
        accountNumber,
        accountName: form.accountName.trim(),
        amount,
        narration: form.narration.trim() || 'Copup Bank transfer',
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
