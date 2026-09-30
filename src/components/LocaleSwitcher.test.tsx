import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocaleSwitcher from './LocaleSwitcher'
import { renderWithI18n } from '../test/renderWithI18n'
import { useAppStore } from '../stores/app'
import { ROW_1, ROW_2, ROW_3 } from '../i18n/types'

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    useAppStore.setState({ locale: 'ie' })
    localStorage.removeItem('snapper-locale')
  })

  afterEach(() => {
    useAppStore.setState({ locale: 'ie' })
    localStorage.removeItem('snapper-locale')
  })

  it('shows the current locale flag on the trigger', () => {
    useAppStore.setState({ locale: 'pl' })
    renderWithI18n(<LocaleSwitcher />)
    expect(screen.getByRole('button', { name: /switch language/i })).toBeInTheDocument()
  })

  it('opens the popover on trigger click and renders all 45 flag buttons', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /(polish|polainnis)/i })).toBeInTheDocument()
    })
    const popoverButtons = screen
      .getAllByRole('button')
      .filter(b => b.getAttribute('aria-label')?.startsWith('Switch to '))

    expect(popoverButtons.length).toBeGreaterThanOrEqual(44)
  })

  it('uses currentAriaLabel for the current locale button', async () => {
    const user = userEvent.setup()

    useAppStore.setState({ locale: 'pl' })
    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    await waitFor(() => expect(screen.queryAllByRole('button').length).toBeGreaterThan(10), {
      timeout: 3000,
    })
    const allLabels = screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? '')

    expect(allLabels.some(l => /current language/i.test(l))).toBe(true)
  })

  it('clicking a flag updates the store locale and closes the popover', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(await screen.findByRole('button', { name: /(polish|polainnis)/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /(polish|polainnis)/i }))
    await waitFor(() => {
      expect(useAppStore.getState().locale).toBe('pl')
    })
  })

  it('selecting German updates the store locale', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(await screen.findByRole('button', { name: /(german|gearmáinis)/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /(german|gearmáinis)/i }))
    await waitFor(() => {
      expect(useAppStore.getState().locale).toBe('de')
    })
  })

  it('renders 45 distinct flag buttons across 3 rows of 15', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(await screen.findByRole('button', { name: /(polish|polainnis)/i })).toBeInTheDocument()
    const flagButtons = screen
      .getAllByRole('button')
      .filter(
        b => b.dataset.current === 'true' || /^Switch to /.test(b.getAttribute('aria-label') ?? '')
      )

    expect(flagButtons).toHaveLength(45)
    expect([...ROW_1, ...ROW_2, ...ROW_3]).toHaveLength(45)
  })

  it('arrow-right moves focus within row 1, wraps at end', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(
      await screen.findByRole('button', { name: /current language: (irish|gaeilge)/i })
    ).toBeInTheDocument()
    const ieButton = screen.getByRole('button', { name: /current language: (irish|gaeilge)/i })

    ieButton.focus()
    fireEvent.keyDown(ieButton, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/english|béarla/i)
    })
  })

  it('arrow-left wraps from row start to row end', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(
      await screen.findByRole('button', { name: /current language: (irish|gaeilge)/i })
    ).toBeInTheDocument()
    const ieButton = screen.getByRole('button', { name: /current language: (irish|gaeilge)/i })

    ieButton.focus()
    fireEvent.keyDown(ieButton, { key: 'ArrowLeft' })
    await waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/greek|gréigis/i)
    })
  })

  it('arrow-down moves to the same column in the next row', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(
      await screen.findByRole('button', { name: /current language: (irish|gaeilge)/i })
    ).toBeInTheDocument()
    const ieButton = screen.getByRole('button', { name: /current language: (irish|gaeilge)/i })

    ieButton.focus()
    fireEvent.keyDown(ieButton, { key: 'ArrowDown' })
    await waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(
        /chinese|sínis|简体中文|簡體中文/i
      )
    })
  })

  it('arrow-down on row 3 clamps (no-op)', async () => {
    const user = userEvent.setup()

    useAppStore.setState({ locale: 'cz' })
    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    const currentRe = /current language: (czech|čeština)/i

    expect(await screen.findByRole('button', { name: currentRe })).toBeInTheDocument()
    const czButton = screen.getByRole('button', { name: currentRe })

    czButton.focus()
    fireEvent.keyDown(czButton, { key: 'ArrowDown' })
    await waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/czech|čeština/i)
    })
  })

  it('arrow-up on row 1 clamps (no-op)', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(
      await screen.findByRole('button', { name: /current language: (irish|gaeilge)/i })
    ).toBeInTheDocument()
    const ieButton = screen.getByRole('button', { name: /current language: (irish|gaeilge)/i })

    ieButton.focus()
    fireEvent.keyDown(ieButton, { key: 'ArrowUp' })
    await waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/irish|gaeilge/i)
    })
  })

  it('arrow-up moves to the prev row in the same column', async () => {
    const user = userEvent.setup()

    useAppStore.setState({ locale: 'cn' })
    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    const currentRe = /current language: (chinese|简体中文)/i

    expect(await screen.findByRole('button', { name: currentRe })).toBeInTheDocument()
    const cnButton = screen.getByRole('button', { name: currentRe })

    cnButton.focus()
    fireEvent.keyDown(cnButton, { key: 'ArrowUp' })
    await waitFor(() => {
      const label = document.activeElement?.getAttribute('aria-label') ?? ''

      expect(label.toLowerCase()).toMatch(/irish|gaeilge|爱尔兰语|愛爾蘭語/)
    })
  })

  it('non-arrow keys are ignored by the grid handler', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch language/i }))
    expect(
      await screen.findByRole('button', { name: /current language: (irish|gaeilge)/i })
    ).toBeInTheDocument()
    const ieButton = screen.getByRole('button', { name: /current language: (irish|gaeilge)/i })

    ieButton.focus()
    fireEvent.keyDown(ieButton, { key: 'Tab' })
    expect(useAppStore.getState().locale).toBe('ie')
  })

  it('uses native Polish language name when current locale is pl', async () => {
    const user = userEvent.setup()

    useAppStore.setState({ locale: 'pl' })
    renderWithI18n(<LocaleSwitcher />, 'pl')
    const trigger = screen.getAllByRole('button')[0]

    if (trigger === undefined) throw new Error('trigger button missing')
    await user.click(trigger)
    await waitFor(
      () => {
        const polishLabel = screen
          .getAllByRole('button')
          .map(b => b.getAttribute('aria-label') ?? '')
          .find(l => /polski/.test(l))

        expect(polishLabel).toBeDefined()
      },
      { timeout: 3000 }
    )
  })

  it('announces the language and available script rather than a flag country', async () => {
    const user = userEvent.setup()

    useAppStore.setState({ locale: 'us' })
    renderWithI18n(<LocaleSwitcher />)
    await user.click(screen.getByTestId('locale-switcher-trigger'))

    for (const language of [
      'Irish',
      'Portuguese',
      'Simplified Chinese',
      'Traditional Chinese',
      'Serbian (Latin)',
    ]) {
      expect(screen.getByRole('button', { name: `Switch to ${language}` })).toBeInTheDocument()
    }

    expect(screen.queryByRole('button', { name: 'Switch to Brazil' })).not.toBeInTheDocument()
  })

  it.each(['ar', 'he', 'fa'] as const)(
    'moves horizontal focus in the visual direction for %s',
    async language => {
      const user = userEvent.setup()

      renderWithI18n(<LocaleSwitcher />, language)
      await user.click(screen.getByTestId('locale-switcher-trigger'))
      const english = document.querySelector<HTMLButtonElement>('[data-locale="us"]')

      expect(english?.closest('[dir]')).toHaveAttribute('dir', 'rtl')
      expect(english).not.toBeNull()
      if (english === null) throw new Error('English language button missing')
      english.focus()
      fireEvent.keyDown(english, { key: 'ArrowRight' })
      expect(document.activeElement).toHaveAttribute('data-locale', 'ie')
      english.focus()
      fireEvent.keyDown(english, { key: 'ArrowLeft' })
      expect(document.activeElement).toHaveAttribute('data-locale', 'pl')
    }
  )
})
