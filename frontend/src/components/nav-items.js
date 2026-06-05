import { FaCreditCard, FaHome, FaRegChartBar, FaUserAlt, FaWallet } from 'react-icons/fa'

export const navItems = [
  { label: 'Home', to: '/dashboard', icon: FaHome, active: true },
  { label: 'Rewards', to: '/wallet', icon: FaWallet, active: true },
  { label: 'Finance', to: '/bank', icon: FaRegChartBar, active: true },
  { label: 'Cards', to: '/wallet', icon: FaCreditCard, active: false },
  { label: 'Me', to: '/me', icon: FaUserAlt, active: true },
]
