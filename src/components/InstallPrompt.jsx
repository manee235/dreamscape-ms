import React, { useEffect, useState } from 'react'
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react'

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

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
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
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <Smartphone size={22} />
        </div>
        <div className="install-banner-text">
          <strong>Install Dreamscape MS App</strong>
          {isIOS ? (
            <p>
              Tap <Share size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Share then <strong>"Add to Home Screen"</strong> <PlusSquare size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </p>
          ) : (
            <p>Install for instant mobile access, fast refresh &amp; offline capability.</p>
          )}
        </div>
      </div>

      <div className="install-banner-actions">
        {!isIOS && deferredPrompt && (
          <button className="btn btn-primary btn-sm" onClick={handleInstallClick}>
            <Download size={14} /> Install Now
          </button>
        )}
        <button className="install-dismiss-btn" onClick={handleDismiss} title="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
