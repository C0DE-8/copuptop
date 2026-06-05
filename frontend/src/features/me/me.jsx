import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiFileText,
  FiGift,
  FiHeadphones,
  FiHome,
  FiKey,
  FiLock,
  FiMessageCircle,
  FiPower,
  FiSettings,
  FiShield,
  FiSmartphone,
  FiSun,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { RiBankCardLine, RiSpeedUpLine, RiStore2Line } from 'react-icons/ri'
import { getUserProfile } from '../../api/auth.api'
import { getBalance } from '../../api/wallet.api'
import styles from './me.module.css'

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('copup_user') || 'null')
  } catch {
    return null
  }
}

const mainGroups = [
  [
    { label: 'Transaction History', icon: FiClipboard, description: '' },
    { label: 'Account Limits', icon: RiSpeedUpLine, description: 'View your transaction limits' },
    { label: 'Bank Card/Account', icon: RiBankCardLine, description: 'Add payment option' },
    { label: 'My BizPayment', icon: RiStore2Line, description: 'Receive payment for business', badge: 'Fast TFR' },
    { label: 'OJunior', icon: FiUsers, description: 'Create an account for your child/ward' },
  ],
  [
    { label: 'Security Center', icon: FiShield, description: 'Protect your funds' },
    { label: 'Customer Service Center', icon: FiHeadphones, description: '' },
    { label: 'Invitation', icon: FiGift, description: 'Invite friends and earn up to ₦5,600 Bonus' },
    { label: 'Opay USSD', icon: FiSmartphone, description: '' },
  ],
]

const settingsGroups = [
  [
    { label: 'My Profile', icon: FiUser },
    { label: 'Payment Settings', icon: FiLock },
    { label: 'Login Settings', icon: FiKey },
    { label: 'Savings Settings', icon: RiBankCardLine },
  ],
  [
    { label: 'Homepage Settings', icon: FiHome, alert: true },
    { label: 'Security Questions', icon: FiShield, meta: 'Not Set' },
    { label: 'SMS Alert Settings', icon: FiMessageCircle },
    { label: 'Security Plus', icon: FiShield },
    { label: 'Access to Clipboard', icon: FiFileText },
    { label: 'Themes', icon: FiSun, action: 'themes' },
  ],
  [
    { label: 'Security Center', icon: FiShield },
    { label: 'Feedback and Suggestions', icon: FiFileText },
  ],
  [{ label: 'Close Account', icon: FiPower }],
  [{ label: 'About', icon: FiMessageCircle }],
]

const themeOptions = [
  { label: 'Light Mode', value: 'light' },
  { label: 'Dark Mode', value: 'dark' },
  { label: 'System Default', value: 'system', description: 'This will use your device settings' },
]

const Me = () => {
  const navigate = useNavigate()
  const [screen, setScreen] = useState('home')
  const [profile, setProfile] = useState(() => readStoredUser())
  const [wallet, setWallet] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('opay_theme') || 'dark')

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const [profileResult, balanceResult] = await Promise.all([getUserProfile(), getBalance()])
        setProfile(profileResult.data.user)
        setWallet(balanceResult.data.wallet)
        localStorage.setItem('copup_user', JSON.stringify(profileResult.data.user))
      } catch {
        setProfile((current) => current || readStoredUser())
      }
    }

    loadAccount()
  }, [])

  const handleThemeChange = (value) => {
    setTheme(value)
    localStorage.setItem('opay_theme', value)
  }

  const handleSignOut = () => {
    localStorage.removeItem('copup_access_token')
    localStorage.removeItem('copup_refresh_token')
    localStorage.removeItem('copup_user')
    navigate('/', { replace: true })
  }

  const firstName = profile?.firstName || 'Opay'
  const lastName = profile?.lastName || 'customer'
  const displayName = `${firstName} ${lastName}`.trim()
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const currency = wallet?.currency === 'NGN' ? '₦' : wallet?.currency || '₦'
  const balance = Number(wallet?.balance || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (screen === 'settings') {
    return (
      <section className={styles.page}>
        <Header title="Settings" onBack={() => setScreen('home')} />

        <div className={styles.settingsStack}>
          {settingsGroups.map((group, groupIndex) => (
            <div className={styles.group} key={`settings-${groupIndex}`}>
              {group.map((item) => (
                <MenuRow
                  item={item}
                  key={item.label}
                  onClick={
                    item.action === 'themes'
                      ? () => setScreen('themes')
                      : item.label === 'Close Account'
                        ? handleSignOut
                        : undefined
                  }
                />
              ))}
            </div>
          ))}
          <button className={styles.signOut} type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </section>
    )
  }

  if (screen === 'themes') {
    return (
      <section className={styles.page}>
        <Header title="Themes" onBack={() => setScreen('settings')} />

        <div className={styles.themeStack}>
          {themeOptions.map((option) => (
            <button
              className={`${styles.themeOption} ${theme === option.value ? styles.selectedTheme : ''}`}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              key={option.value}
            >
              <span>
                <strong>{option.label}</strong>
                {option.description && <small>{option.description}</small>}
              </span>
              <em>{theme === option.value ? '✓' : ''}</em>
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.profileHeader}>
        <div className={styles.identity}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h1>Hi, {displayName}</h1>
            <span>Tier 3</span>
          </div>
        </div>
        <button className={styles.settingsButton} type="button" onClick={() => setScreen('settings')} aria-label="Settings">
          <FiSettings />
        </button>
        <div className={styles.securityOrb} aria-hidden="true">
          <FiShield />
        </div>
      </header>

      <section className={styles.balancePanel}>
        <button type="button" onClick={() => setBalanceVisible((current) => !current)}>
          Total Balance
          <span>{balanceVisible ? '●' : '○'}</span>
        </button>
        <strong>{balanceVisible ? `${currency}${balance}` : '****'}</strong>
        <p>
          Interest Credited Today <span>+₦0.18</span>
        </p>
      </section>

      <section className={styles.securityNotice}>
        <FiShield />
        <div>
          <strong>Security Check is not turned on</strong>
          <span>Make your account more secure with extra safety checks.</span>
        </div>
        <button type="button">Turn On</button>
      </section>

      <div className={styles.homeGroups}>
        {mainGroups.map((group, groupIndex) => (
          <div className={styles.group} key={`main-${groupIndex}`}>
            {group.map((item) => (
              <MenuRow item={item} key={item.label} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

const Header = ({ title, onBack }) => (
  <header className={styles.subHeader}>
    <button type="button" onClick={onBack} aria-label="Go back">
      <FiChevronLeft />
    </button>
    <h1>{title}</h1>
  </header>
)

const MenuRow = ({ item, onClick }) => {
  const Icon = item.icon

  return (
    <button className={styles.row} type="button" onClick={onClick}>
      <Icon />
      <span>
        <strong>{item.label}</strong>
        {item.description && <small>{item.description}</small>}
      </span>
      {item.badge && <em>{item.badge}</em>}
      {item.alert && <i />}
      {item.meta && <b>{item.meta}</b>}
      <FiChevronRight className={styles.chevron} />
    </button>
  )
}

export default Me
