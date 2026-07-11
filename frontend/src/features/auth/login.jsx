import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft } from 'react-icons/fi'
import { loginUser } from '../../api/auth.api'
import logo from '../../assets/logo.png'
import styles from './login.module.css'

const REMEMBERED_USER_KEY = 'copup_remembered_user'

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

const rememberUser = (user) => {
  if (!user) {
    return
  }

  localStorage.setItem(
    REMEMBERED_USER_KEY,
    JSON.stringify({
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    }),
  )
}

const formatAccount = (value) => String(value || '').replace(/\s/g, '')

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [rememberedUser] = useState(() => readJson(REMEMBERED_USER_KEY) || readJson('copup_user'))
  const [useRememberedUser, setUseRememberedUser] = useState(() => Boolean(readJson(REMEMBERED_USER_KEY) || readJson('copup_user')))
  const [pendingIdentifier, setPendingIdentifier] = useState('')
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nextPath = location.state?.from?.pathname || '/dashboard'
  const savedIdentifier = rememberedUser?.email || rememberedUser?.phone || ''
  const isReturningUser = useRememberedUser && Boolean(savedIdentifier)
  const loginIdentifier = isReturningUser ? savedIdentifier : pendingIdentifier
  const displayIdentifier = isReturningUser ? rememberedUser?.phone || rememberedUser?.email || '' : pendingIdentifier
  const needsPassword = isReturningUser || Boolean(pendingIdentifier)

  useEffect(() => {
    if (localStorage.getItem('copup_access_token')) {
      navigate(nextPath, { replace: true })
    }
  }, [navigate, nextPath])

  const initials = useMemo(() => {
    const first = rememberedUser?.firstName?.charAt(0) || 'O'
    const last = rememberedUser?.lastName?.charAt(0) || 'P'
    return `${first}${last}`.toUpperCase()
  }, [rememberedUser])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleUseAnotherAccount = () => {
    setUseRememberedUser(false)
    setPendingIdentifier('')
    setError('')
    setForm({ identifier: '', password: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!needsPassword) {
      const identifier = formatAccount(form.identifier)

      if (!identifier) {
        setError('Enter your Mobile No./Email')
        return
      }

      setPendingIdentifier(identifier)
      setForm((current) => ({ ...current, identifier, password: '' }))
      return
    }

    setLoading(true)

    try {
      const result = await loginUser({
        identifier: formatAccount(loginIdentifier),
        email: formatAccount(loginIdentifier),
        password: form.password,
      })
      localStorage.setItem('copup_access_token', result.data.accessToken)
      localStorage.setItem('copup_refresh_token', result.data.refreshToken)
      localStorage.setItem('copup_user', JSON.stringify(result.data.user))
      rememberUser(result.data.user)
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.phone}>
        <nav className={styles.topBar}>
          <button type="button" aria-label="Go back" onClick={needsPassword ? handleUseAnotherAccount : undefined}>
            <FiChevronLeft />
          </button>
          <a href="mailto:support@opay.com">Help</a>
        </nav>

        {needsPassword ? (
          <>
            <div className={styles.returningHeader}>
              <div className={styles.avatar}>{initials}</div>
              <p>{displayIdentifier}</p>
              <h1>Welcome back!</h1>
            </div>

            <form className={styles.returningForm} onSubmit={handleSubmit}>
              <label htmlFor="password">Enter your 6-digit Password to log in</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                inputMode="numeric"
                placeholder="Enter 6-digit Password"
                required
              />

              <button className={styles.forgotButton} type="button">
                Forgot Password?
              </button>

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.primaryButton} type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className={styles.logoLine}>
              <img src={logo} alt="" />
              <strong>Pay</strong>
            </div>

            <form className={styles.fullForm} onSubmit={handleSubmit}>
              <h1>Log in to your account</h1>

              <div className={styles.inputShell}>
                <label htmlFor="identifier">Enter your Mobile No./Email</label>
                <input
                  id="identifier"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  inputMode="email"
                  required
                />
              </div>

              <p className={styles.changeLine}>
                Lost Your Mobile Number, <button type="button">Change Now</button>
              </p>

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.primaryButton} type="submit" disabled={loading}>
                {loading ? 'NEXT' : 'NEXT'}
              </button>
            </form>

            <p className={styles.switch}>
              Don't have an account? <Link to="/register">Click here to Sign Up</Link>
            </p>

            <footer className={styles.licenseLine}>
              <span>Licensed by the <strong>CBN</strong> and insured by the <strong>NDIC</strong></span>
            </footer>
          </>
        )}
      </section>
    </main>
  )
}

export default Login
