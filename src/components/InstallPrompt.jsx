import React, { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already running as installed standalone PWA
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (isApp) {
      setIsStandalone(true)
      return
    }

    // Detect iOS devices (iPhone, iPad, iPod, or Safari on iOS)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iosDevice)

    // Listen for native install prompt event (Android, Chrome, Edge, Windows)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = sessionStorage.getItem('dms_install_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // On iOS Safari, show helper prompt if not dismissed
    if (iosDevice && !sessionStorage.getItem('dms_install_dismissed')) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('dms_install_dismissed', 'true')
  }

  if (isStandalone || !showPrompt) return null

  return (
    <aside className="install-banner" aria-label="Install App Banner">
      <div className="install-banner-content">
        <div className="install-banner-app-icon">
          <img src="/icon.svg" alt="Dreamscape Logo" />
        </div>
        <div className="install-banner-text">
          <div className="install-banner-title">
            <strong>Install Dreamscape App</strong>
            {isIOS && <span className="install-ios-pill">iOS Safari</span>}
          </div>
          {isIOS ? (
            <p>
              Tap <Share size={13} className="inline-icon" /> <strong>Share</strong>, then scroll and tap <strong>"Add to Home Screen"</strong> <PlusSquare size={13} className="inline-icon" />
            </p>
          ) : (
            <p>Install for instant mobile home-screen access &amp; offline capability.</p>
          )}
        </div>
      </div>

      <div className="install-banner-actions">
        {!isIOS && deferredPrompt && (
          <button className="btn btn-primary btn-sm install-cta-btn" onClick={handleInstallClick}>
            <Download size={14} /> Install Now
          </button>
        )}
        <button
          className="install-dismiss-btn"
          onClick={handleDismiss}
          title="Dismiss"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </aside>
  )
}
