import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AlertToastBody } from './AlertToastBody'

describe('AlertToastBody', () => {
  it('renders the message text verbatim including the newline between title and body', () => {
    render(
      <AlertToastBody
        message={'Order filled\nBUY 100 BTC @ 78,000'}
        cta='View'
        onClick={() => undefined}
      />
    )
    const pre = screen.getByText(/Order filled/)

    expect(pre.textContent).toBe('Order filled\nBUY 100 BTC @ 78,000')
  })

  it('renders the CTA button with the localized label', () => {
    render(<AlertToastBody message='Title\nBody' cta='Wyświetl' onClick={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Wyświetl' })).toBeInTheDocument()
  })

  it('invokes onClick exactly once when the CTA button is clicked', () => {
    const onClick = vi.fn()

    render(<AlertToastBody message='Title\nBody' cta='View' onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
