import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/auth.api'
import styles from './login.module.css'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nextPath = location.state?.from?.pathname || '/dashboard'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginUser(form)
      localStorage.setItem('copup_access_token', result.data.accessToken)
      localStorage.setItem('copup_refresh_token', result.data.refreshToken)
      localStorage.setItem('copup_user', JSON.stringify(result.data.user))
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>CB</span>
          <div>
            <p>Copup Bank</p>
            <h1>Sign in to your account</h1>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className={styles.switch}>
          New to Copup Bank? <Link to="/register">Create an account</Link>
        </p>
      </section>

      <aside className={styles.summary}>
        <p className={styles.eyebrow}>Operating account</p>
        <h2>Wallets, bank transfers, and transaction control from one desk.</h2>
        <div className={styles.metrics}>
          <span>Ledger-first balance</span>
          <strong>24/7</strong>
        </div>
      </aside>
    </main>
  )
}

export default Login
