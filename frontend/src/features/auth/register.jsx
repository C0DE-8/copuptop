import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../api/auth.api'
import styles from './register.module.css'

const Register = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    deviceName: 'Web app',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await registerUser(form)
      localStorage.setItem('copup_access_token', result.data.accessToken)
      localStorage.setItem('copup_refresh_token', result.data.refreshToken)
      localStorage.setItem('copup_user', JSON.stringify(result.data.user))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <span className={styles.mark}>CB</span>
          <p>Copup Bank</p>
          <h1>Create your account</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label>
              First name
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </label>
            <label>
              Last name
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>
          </div>

          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>

          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              minLength="8"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className={styles.switch}>
          Already registered? <Link to="/">Sign in</Link>
        </p>
      </section>
    </main>
  )
}

export default Register
