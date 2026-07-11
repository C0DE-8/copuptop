import { useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { Outlet } from 'react-router-dom'
import Navigation from './navigation'
import styles from './app-shell.module.css'

const refreshThreshold = 84

const AppShell = () => {
  const startY = useRef(0)
  const pulling = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const handleTouchStart = (event) => {
    if (window.scrollY > 0 || refreshing) {
      return
    }

    pulling.current = true
    startY.current = event.touches[0].clientY
  }

  const handleTouchMove = (event) => {
    if (!pulling.current) {
      return
    }

    const distance = event.touches[0].clientY - startY.current

    if (distance <= 0) {
      setPullDistance(0)
      return
    }

    setPullDistance(Math.min(distance * 0.55, 110))
  }

  const handleTouchEnd = () => {
    if (!pulling.current) {
      return
    }

    pulling.current = false

    if (pullDistance >= refreshThreshold) {
      setRefreshing(true)
      window.location.reload()
      return
    }

    setPullDistance(0)
  }

  const indicatorVisible = pullDistance > 8 || refreshing

  return (
    <div
      className={styles.shell}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`${styles.refreshIndicator} ${indicatorVisible ? styles.visible : ''} ${
          pullDistance >= refreshThreshold || refreshing ? styles.ready : ''
        }`}
        style={{ transform: `translate(-50%, ${indicatorVisible ? Math.max(0, pullDistance - 58) : -72}px)` }}
        role="status"
        aria-live="polite"
      >
        <FiRefreshCw />
        <span>{refreshing ? 'Refreshing' : pullDistance >= refreshThreshold ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <Navigation />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
