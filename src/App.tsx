import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './stores/auth'
import { useAppStore } from './stores/app'
import { useTabRouting, type ValidTab } from './hooks/useHashRouting'
import { useAppShell } from './hooks/useAppShell'
import { useScopePersistence } from './hooks/useScopePersistence'
import { AppRoutes } from './components/AppRoutes'
import { ALL_TABS } from './components/tabs'
import UserProfile from './components/auth/UserProfile'
import { TimeTravelPicker } from './components/TimeTravelPicker'
import { OperatorPicker } from './components/OperatorPicker'
import { WalletPicker } from './components/WalletPicker'
import LocaleSwitcher from './components/LocaleSwitcher'
import { Menu, Wifi, WifiOff, X, Sun, Moon, Clock } from 'lucide-react'

function App() {
  const [activeTab, navigateToTab] = useTabRouting()
  const { canAccess } = useAuth()
  const { isConnected, connectionLag, subscribedTopicsCount } = useAppShell()
  const { t } = useTranslation('common')

  useScopePersistence()
  const isDarkMode = useAppStore(s => s.isDarkMode)
  const toggleDarkMode = useAppStore(s => s.toggleDarkMode)
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const tabs = ALL_TABS.filter(tab => canAccess(tab.id))
  const lagValue = connectionLag >= 0 ? `${connectionLag} ms` : t('chrome.lagUnknown')

  const handleNavigate = (tabId: ValidTab) => {
    navigateToTab(tabId)
    setSidebarOpen(false)
  }

  return (
    <div className='flex h-screen bg-dark-900 text-alpine-900'>
      {sidebarOpen && (
        <button
          type='button'
          className='fixed inset-0 z-40 bg-black/40 md:hidden appearance-none border-none cursor-default'
          onClick={() => setSidebarOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') setSidebarOpen(false)
          }}
          aria-label={t('chrome.closeSidebar')}
        />
      )}
      <aside
        aria-label={t('chrome.sidebar')}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-dark-600 bg-alpine-50 px-4 py-6 transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='mb-4 flex shrink-0 items-center justify-between px-2 md:mb-8'>
          <div>
            <div className='text-xs font-semibold tracking-[0.16em] text-muted-500 uppercase'>
              {t('chrome.brand')}
            </div>
            <h1 className='mt-1 text-xl font-semibold text-alpine-900 md:mt-2'>
              {t('chrome.console')}
            </h1>
            <p className='mt-1 hidden text-sm text-muted-600 md:block'>{t('chrome.tagline')}</p>
          </div>
          <button
            className='rounded-lg p-1 text-muted-600 hover:bg-dark-700 md:hidden'
            onClick={() => setSidebarOpen(false)}
            aria-label={t('chrome.closeSidebar')}
          >
            <X size={20} />
          </button>
        </div>
        <nav
          aria-label={t('chrome.mainNavigation')}
          className='flex-1 space-y-1.5 overflow-y-auto pr-1'
        >
          {tabs.map(tab => {
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => handleNavigate(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={
                  activeTab === tab.id
                    ? 'flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 transition-all duration-200'
                    : 'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted-700 transition-all duration-200 hover:border-dark-600 hover:bg-dark-700 hover:text-alpine-900'
                }
              >
                <Icon
                  size={16}
                  className={activeTab === tab.id ? 'text-brand-600' : 'text-muted-600'}
                />
                <span>{t(tab.labelKey)}</span>
              </button>
            )
          })}
        </nav>
      </aside>
      <section className='flex min-w-0 flex-1 flex-col'>
        <header className='border-b border-dark-600 bg-alpine-50 px-4 py-4 sm:px-6'>
          <div className='flex items-center justify-between gap-3'>
            <button
              className='rounded-lg p-1 text-muted-600 hover:bg-dark-700 md:hidden'
              onClick={() => setSidebarOpen(true)}
              aria-label={t('chrome.openSidebar')}
            >
              <Menu size={20} />
            </button>
            <div className='ml-auto flex flex-wrap items-center justify-end gap-3'>
              <OperatorPicker />
              <WalletPicker />
              <div className='hidden md:flex'>
                <TimeTravelPicker />
              </div>
              {!isTimeTraveling && (
                <span
                  className='hidden text-sm tabular-nums text-muted-600 sm:inline'
                  title={t('chrome.lagTitle')}
                >
                  {t('chrome.lag')} {lagValue}
                </span>
              )}
              <span
                className='hidden text-sm tabular-nums text-muted-600 sm:inline'
                title={t('chrome.topicsTitle')}
              >
                {t('chrome.topics')} {subscribedTopicsCount}
              </span>
              <span
                className={
                  isConnected
                    ? 'inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-800 sm:px-3'
                    : 'inline-flex items-center gap-1.5 rounded-full border border-loss-200 bg-loss-50 px-2 py-1 text-xs font-semibold text-loss-800 sm:px-3'
                }
                title={isConnected ? t('chrome.connectedTitle') : t('chrome.disconnectedTitle')}
              >
                {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                <span className='hidden sm:inline'>
                  {isConnected ? t('chrome.connected') : t('chrome.disconnected')}
                </span>
              </span>
              <LocaleSwitcher />
              <button
                onClick={toggleDarkMode}
                className='rounded-lg p-2 text-muted-600 hover:bg-dark-700 transition-colors'
                aria-label={
                  isDarkMode ? t('chrome.switchToLightMode') : t('chrome.switchToDarkMode')
                }
                title={isDarkMode ? t('chrome.switchToLightMode') : t('chrome.switchToDarkMode')}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <UserProfile />
            </div>
          </div>
        </header>
        {isTimeTraveling &&
          activeTab !== 'processes' &&
          activeTab !== 'strategies' &&
          activeTab !== 'health' && (
            <div className='flex items-center gap-2 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800'>
              <Clock size={14} />
              <span>{t('chrome.timeTravelBanner')}</span>
            </div>
          )}
        <main className='flex-1 flex flex-col min-h-0'>
          <section
            aria-label={t('chrome.tradingContent')}
            className='flex-1 overflow-y-auto p-4 sm:p-6'
          >
            <a
              href='#trading-content-end'
              className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-lg bg-alpine-50 px-3 py-2 text-sm font-medium text-brand-700 shadow focus:outline-hidden focus:ring-2 focus:ring-brand-500'
            >
              {t('chrome.skipToContent')}
            </a>
            <div className='mx-auto w-full max-w-screen-2xl'>
              <AppRoutes activeTab={activeTab} />
            </div>
            <span id='trading-content-end' aria-hidden='true' />
          </section>
        </main>
      </section>
    </div>
  )
}

export default App
