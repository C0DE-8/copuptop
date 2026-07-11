export const categoryOptions = ['All Categories', 'Deposit', 'Transfer', 'Airtime', 'Interest']
export const statusOptions = ['All Status', 'Successful', 'Pending', 'Failed']

export const getCurrencySymbol = (currency) => (currency === 'NGN' || !currency ? '₦' : currency)

export const formatAmount = (item) => {
  const symbol = getCurrencySymbol(item.currency)
  return `${item.entryType === 'credit' ? '+' : '-'}${symbol}${Number(item.amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const formatDate = (value) => {
  if (!value) {
    return 'May 29th, 02:15:52'
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const formatReceiptDate = (value) =>
  new Date(value || Date.now()).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

export const formatMonth = (value) =>
  new Date(value || Date.now()).toLocaleString(undefined, { month: 'short', year: 'numeric' })

export const compactName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()

export const maskAccount = (value) => {
  const text = String(value || '').replace(/\D/g, '')

  if (text.length < 6) {
    return text
  }

  return `${text.slice(0, 3)}****${text.slice(-3)}`
}

export const formatTransactionReference = (value, fallback = '260710010100435781471369') => {
  const digits = String(value || '').replace(/\D/g, '')

  return digits || fallback
}

export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('copup_user') || 'null')
  } catch {
    return null
  }
}

export const getCounterpartyName = (item) => {
  const bankName = compactName(item.bankAccountName)
  const walletName = compactName(`${item.counterpartyFirstName || ''} ${item.counterpartyLastName || ''}`)

  if (bankName) {
    return bankName
  }

  if (walletName) {
    return walletName
  }

  const description = String(item.description || '')
  const match = description.match(/transfer\s+(?:to|from)\s+(.+)/i)

  if (match?.[1]) {
    return compactName(match[1])
  }

  return ''
}

export const getPaymentLabel = (item) => {
  if (item.bankAccountName || item.bankAccountNumber) {
    return 'Opay'
  }

  if (item.description?.toLowerCase().includes('wealth')) {
    return 'OWealth'
  }

  return 'Opay'
}

export const getTransactionTitle = (item) => {
  const description = String(item.description || '').trim()
  const descriptionLower = description.toLowerCase()
  const counterpartyName = getCounterpartyName(item)

  if (counterpartyName && (item.bankAccountName || item.counterpartyFirstName || descriptionLower.includes('transfer'))) {
    return `Transfer ${item.entryType === 'credit' ? 'from' : 'to'} ${counterpartyName}`
  }

  if (descriptionLower.includes('airtime')) return 'Airtime'
  if (descriptionLower.includes('bonus')) return 'Bonus from Airtime Purchase'
  if (descriptionLower.includes('safebox') && descriptionLower.includes('withdraw')) return 'SafeBox Withdrawal'
  if (descriptionLower.includes('safebox')) return 'SafeBox Deposit'
  if (descriptionLower.includes('interest')) return description || 'OWealth Interest Earned'
  if (descriptionLower.includes('deposit')) return description || 'Spend & Save Deposit'

  return description || (item.entryType === 'credit' ? 'Transfer from Opay account' : 'Transfer to Opay account')
}

export const getPartyDetails = (item) => {
  const counterpartyName = getCounterpartyName(item)
  const paymentLabel = getPaymentLabel(item)
  const account = item.bankAccountNumber || item.counterpartyPhone || item.counterpartyEmail || ''
  const masked = maskAccount(account)

  if (!counterpartyName) {
    return item.description || 'Opay'
  }

  return masked ? `${counterpartyName}\n${paymentLabel} | ${masked}` : `${counterpartyName}\n${paymentLabel}`
}

export const getReceiptParties = (item) => {
  const user = readStoredUser()
  const userName = compactName(`${user?.firstName || ''} ${user?.lastName || ''}`) || 'OPAY USER'
  const userPhone = user?.phone || user?.email || ''
  const userDetails = maskAccount(userPhone) ? `OPay | ${maskAccount(userPhone)}` : 'OPay'
  const counterpartyName = getCounterpartyName(item) || compactName(item.description) || 'OPAY'
  const counterpartyAccount = item.bankAccountNumber || item.counterpartyPhone || item.counterpartyEmail || ''
  const counterpartyDetails = maskAccount(counterpartyAccount) ? `OPay | ${maskAccount(counterpartyAccount)}` : getPaymentLabel(item)

  if (item.entryType === 'credit') {
    return {
      recipientName: userName,
      recipientDetails: userDetails,
      senderName: counterpartyName,
      senderDetails: counterpartyDetails,
    }
  }

  return {
    recipientName: counterpartyName,
    recipientDetails: counterpartyDetails,
    senderName: userName,
    senderDetails: userDetails,
  }
}

export const findTransactionById = (ledger, transactionId) =>
  ledger.find((item) => formatTransactionReference(item.reference) === String(transactionId))
