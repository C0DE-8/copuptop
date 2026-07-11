import { FaArrowDown, FaArrowUp, FaGift, FaMobileAlt, FaPercent, FaPiggyBank, FaStore } from 'react-icons/fa'

const TransactionIcon = ({ item }) => {
  const description = (item.description || '').toLowerCase()

  if (description.includes('airtime')) return <FaMobileAlt />
  if (description.includes('bonus')) return <FaGift />
  if (description.includes('interest') || description.includes('wealth')) return <FaPercent />
  if (description.includes('safe') || description.includes('save')) return <FaPiggyBank />
  if (item.bankAccountName || description.includes('transfer')) return item.entryType === 'credit' ? <FaArrowDown /> : <FaArrowUp />
  return <FaStore />
}

export default TransactionIcon
