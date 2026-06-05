import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiSearch,
  FiWifi,
  FiX,
} from 'react-icons/fi'
import { getBanks, resolveBankAccount, transferToBank } from '../../api/bank.api'
import { getWallet } from '../../api/wallet.api'
import styles from './bank.module.css'

const frequentBanks = ['OPay', 'Access Bank', 'United Bank For Africa', 'First Bank Of Nigeria', 'Guaranty Trust Bank', 'Zenith Bank']

const recentRecipients = [
  { name: 'samuel oghenechovwe', meta: '2004507015 Kuda MFB', icon: 'K' },
  { name: 'POS Transfer- osuya favour adaeze', meta: '5974820297 MONIE POINT', icon: 'M' },
  { name: 'Chinwe Egomunuko', meta: '2018359755 Fairmoney MFB', icon: 'F' },
]

const Bank = () => {
  const navigate = useNavigate()
  const [banks, setBanks] = useState([])
  const [wallet, setWallet] = useState(null)
  const [bankSearch, setBankSearch] = useState('')
  const [activeTab, setActiveTab] = useState('recents')
  const [showBankPicker, setShowBankPicker] = useState(false)
  const [step, setStep] = useState('recipient')
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
    let active = true

    const loadBanks = async () => {
      try {
        const [banksResponse, walletResponse] = await Promise.all([getBanks('NG'), getWallet()])

        if (active) {
          setBanks(banksResponse.data.banks || [])
          setWallet(walletResponse.data.wallet || null)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load banks')
        }
      } finally {
        if (active) {
          setLoadingBanks(false)
        }
      }
    }

    loadBanks()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const bankCode = form.bankCode
    const accountNumberToResolve = form.accountNumber.trim()

    if (!bankCode || accountNumberToResolve.length !== 10) {
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
      return banks.slice(0, 80)
    }

    return banks.filter((bank) => bank.name.toLowerCase().includes(query)).slice(0, 80)
  }, [banks, bankSearch])

  const selectedBank = banks.find((bank) => bank.code === form.bankCode)
  const accountNumber = form.accountNumber.trim()
  const amount = Number(form.amount)
  const walletBalance = Number(wallet?.balance || 0)
  const hasResolvedAccount = Boolean(form.accountName)
  const canContinue = form.bankCode && accountNumber.length === 10 && hasResolvedAccount
  const canSubmit = canContinue && amount > 0 && amount <= walletBalance

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
      setResult(null)
      setStep('recipient')
    }
  }

  const chooseBank = (bank) => {
    setForm((current) => ({
      ...current,
      bankCode: bank.code,
      accountName: '',
    }))
    setBankSearch(bank.name)
    setResolveError('')
    setResult(null)
    setStep('recipient')
    setShowBankPicker(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!canContinue) {
      setError('Confirm the recipient account before continuing.')
      return
    }

    if (!amount || amount <= 0) {
      setError('Enter amount after the recipient account has been confirmed.')
      return
    }

    if (amount > walletBalance) {
      setError('Insufficient wallet balance')
      return
    }

    setLoading(true)

    try {
      const response = await transferToBank({
        bankCode: form.bankCode,
        accountNumber,
        accountName: form.accountName.trim(),
        amount,
        narration: form.narration.trim() || 'Opay transfer',
      })
      setResult(response.data || response)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit bank transfer')
    } finally {
      setLoading(false)
    }
  }

  const applyRecent = (recipient) => {
    const [number, ...bankParts] = recipient.meta.split(' ')
    const bankName = bankParts.join(' ')
    const bank = banks.find((item) => bankName.toLowerCase().includes(item.name.toLowerCase()))

    setForm((current) => ({
      ...current,
      accountNumber: number.replace(/\D/g, '').slice(0, 10),
      bankCode: bank?.code || current.bankCode,
      accountName: '',
    }))
    setBankSearch(bank?.name || bankName)
    setResolveError('')
    setResult(null)
    setStep('recipient')
  }

  if (showBankPicker) {
    return (
      <section className={styles.page}>
        <header className={styles.pickerTopbar}>
          <button type="button" onClick={() => setShowBankPicker(false)} aria-label="Close bank picker">
            <FiX />
          </button>
          <h1>Select Bank</h1>
        </header>

        <label className={styles.pickerSearch}>
          <FiSearch />
          <input
            value={bankSearch}
            onChange={(event) => setBankSearch(event.target.value)}
            placeholder={loadingBanks ? 'Loading banks...' : 'Search Bank Name'}
            disabled={loadingBanks}
          />
        </label>

        <section className={styles.frequentBanks}>
          <h2>Frequently Used Bank</h2>
          <div>
            {frequentBanks.map((name) => {
              const bank = banks.find((item) => item.name.toLowerCase().includes(name.toLowerCase()))

              return (
                <button type="button" onClick={() => bank && chooseBank(bank)} disabled={!bank} key={name}>
                  <span>{name.charAt(0)}</span>
                  {name}
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.bankList}>
          <h2>A</h2>
          {filteredBanks.map((bank) => (
            <button type="button" onClick={() => chooseBank(bank)} key={`${bank.code}-${bank.name}`}>
              <span>{bank.name.charAt(0)}</span>
              {bank.name}
            </button>
          ))}
        </section>
      </section>
    )
  }

  if (step === 'amount') {
    return (
      <section className={styles.page}>
        <header className={styles.topbar}>
          <button type="button" onClick={() => setStep('recipient')} aria-label="Back to recipient">
            <FiArrowLeft />
          </button>
          <h1>Transfer to Bank Account</h1>
        </header>

        <section className={styles.recipientSummary}>
          <span>{selectedBank?.name.charAt(0) || 'B'}</span>
          <div>
            <strong>{form.accountName}</strong>
            <em>
              {accountNumber} {selectedBank?.name || 'Bank'}
            </em>
          </div>
        </section>

        <form className={styles.amountFlow} onSubmit={handleSubmit}>
          <section className={styles.amountCard}>
            <h2>Amount</h2>
            <label>
              <span>₦</span>
              <input
                name="amount"
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="100.00 - 5,000,000.00"
                required
                autoFocus
              />
            </label>
            <p className={styles.balanceHint}>
              Balance: ₦{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className={styles.amountPresets}>
              {[500, 1000, 2000, 5000, 9999, 10000].map((value) => (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, amount: String(value) }))}
                  key={value}
                >
                  ₦{value.toLocaleString()}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.remarkCard}>
            <h2>Remark</h2>
            <input
              name="narration"
              value={form.narration}
              onChange={handleChange}
              placeholder="What's this for?(Optional)"
            />
            <div className={styles.remarkPresets}>
              {['Purchase', 'Personal'].map((value) => (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, narration: value }))}
                  key={value}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>

          {amount > walletBalance && <p className={styles.error}>Insufficient wallet balance</p>}
          {error && <p className={styles.error}>{error}</p>}
          {result && <p className={styles.success}>Transfer submitted with reference {result.reference}</p>}

          <div className={styles.confirmFooter}>
            <button type="submit" disabled={loading || !canSubmit}>
              {loading ? 'Submitting...' : 'Confirm'}
            </button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Transfer to Bank Account</h1>
        <Link to="/transactions">History</Link>
      </header>

      <section className={styles.promo}>
        <div>
          <strong>Claim 15 Discounts with</strong>
          <span>₦99 on any Bill</span>
        </div>
        <button type="button">Claim</button>
      </section>

      <div className={styles.freeTransfers}>
        <span>₦</span>
        Free transfers for the day: <strong>2</strong>
      </div>

      <section className={styles.transferCard}>
        <h2>Recipient Account</h2>

        <input
          name="accountNumber"
          value={form.accountNumber}
          onChange={handleChange}
          inputMode="numeric"
          maxLength="10"
          placeholder="Enter 10 digits Account Number"
          required
        />

        <button className={styles.bankButton} type="button" onClick={() => setShowBankPicker(true)}>
          {selectedBank ? (
            <>
              <span>{selectedBank.name.charAt(0)}</span>
              {selectedBank.name}
            </>
          ) : (
            'Select Bank'
          )}
          <FiChevronRight />
        </button>

        {(resolving || form.accountName || resolveError) && (
          <div className={form.accountName ? styles.resolveSuccess : styles.resolveBox}>
            <FiCheck />
            <span>{resolving ? 'Resolving account...' : form.accountName || resolveError}</span>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {result && <p className={styles.success}>Transfer submitted with reference {result.reference}</p>}

        <button
          className={styles.nextButton}
          type="button"
          onClick={() => setStep('amount')}
          disabled={resolving || !canContinue}
        >
          Next
        </button>
      </section>

      <button className={styles.monitor} type="button">
        <span>
          <FiWifi />
        </span>
        Bank Transfer Success Rate Monitor
        <FiChevronRight />
      </button>

      <section className={styles.recipients}>
        <div className={styles.tabs}>
          <button
            className={activeTab === 'recents' ? styles.activeTab : undefined}
            type="button"
            onClick={() => setActiveTab('recents')}
          >
            Recents
          </button>
          <button
            className={activeTab === 'favourites' ? styles.activeTab : undefined}
            type="button"
            onClick={() => setActiveTab('favourites')}
          >
            Favourites
          </button>
          <FiSearch />
        </div>

        <div className={styles.recipientList}>
          {(activeTab === 'recents' ? recentRecipients : recentRecipients.slice(0, 1)).map((recipient) => (
            <button type="button" onClick={() => applyRecent(recipient)} key={recipient.meta}>
              <span>
                <strong>{recipient.name}</strong>
                <em>{recipient.meta}</em>
              </span>
              <i>{recipient.icon}</i>
            </button>
          ))}
        </div>

        <button className={styles.viewAll} type="button">
          View All <FiChevronRight />
        </button>
      </section>
    </section>
  )
}

export default Bank
