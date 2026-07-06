import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import AddOperatorForm from './AddOperatorForm'

const mockCreateMutation = {
  mutate: vi.fn(),
  isPending: false,
}

vi.mock('../../../hooks/queries/wallets', () => ({
  useCreateOperator: () => mockCreateMutation,
}))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid='modal'>
        <h3>{title}</h3>
        <button onClick={onClose} data-testid='modal-close'>
          Close
        </button>
        {children}
      </div>
    ) : null,
}))

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('AddOperatorForm', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMutation.mutate = vi.fn()
    mockCreateMutation.isPending = false
  })

  it('does not render when closed', () => {
    const { queryByTestId } = renderWithQuery(<AddOperatorForm open={false} onClose={onClose} />)

    expect(queryByTestId('modal')).toBeNull()
  })

  it('renders the label and description fields when open', () => {
    const { container, getByTestId } = renderWithQuery(
      <AddOperatorForm open={true} onClose={onClose} />
    )

    expect(getByTestId('modal')).toBeTruthy()
    expect(container.querySelector('#op-label')).toBeTruthy()
    expect(container.querySelector('#op-description')).toBeTruthy()
  })

  it('shows a validation error and does not submit when the label is empty', async () => {
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)
    const form = container.querySelector('form') as HTMLFormElement

    fireEvent.submit(form)

    await waitFor(() => {
      expect(container.querySelector('.text-loss-600')).toBeTruthy()
    })
    expect(mockCreateMutation.mutate).not.toHaveBeenCalled()
  })

  it('clears the validation error when the label is edited', async () => {
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)
    const form = container.querySelector('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => expect(container.querySelector('.text-loss-600')).toBeTruthy())

    fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
      target: { value: 'desk-alpha' },
    })

    expect(container.querySelector('.text-loss-600')).toBeNull()
  })

  it('submits label only (no description) and toasts + closes on success', async () => {
    mockCreateMutation.mutate = vi.fn((_vars, opts) => opts.onSuccess())
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)

    fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
      target: { value: '  desk-alpha  ' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
      { label: 'desk-alpha' },
      expect.anything()
    )
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('submits with a trimmed description when provided', async () => {
    mockCreateMutation.mutate = vi.fn((_vars, opts) => opts.onSuccess())
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)

    fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
      target: { value: 'desk-alpha' },
    })
    fireEvent.change(container.querySelector('#op-description') as HTMLInputElement, {
      target: { value: '  a desk  ' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
      { label: 'desk-alpha', description: 'a desk' },
      expect.anything()
    )
  })

  it.each(['HTTP 409: Conflict', 'operator already exists', 'scope conflict detected'])(
    'toasts the specific conflict message for a conflict error (%s)',
    async (message: string) => {
      mockCreateMutation.mutate = vi.fn((_vars, opts) => opts.onError(new Error(message)))
      const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)

      fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
        target: { value: 'dupe' },
      })
      fireEvent.submit(container.querySelector('form') as HTMLFormElement)

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('An operator with that label already exists')
      )
      expect(onClose).not.toHaveBeenCalled()
    }
  )

  it('toasts the raw message for a generic create error', async () => {
    mockCreateMutation.mutate = vi.fn((_vars, opts) => opts.onError(new Error('boom')))
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)

    fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
      target: { value: 'x' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('boom'))
  })

  it('falls back to the create-error translation when the error has no message', async () => {
    mockCreateMutation.mutate = vi.fn((_vars, opts) => opts.onError(new Error('')))
    const { container } = renderWithQuery(<AddOperatorForm open={true} onClose={onClose} />)

    fireEvent.change(container.querySelector('#op-label') as HTMLInputElement, {
      target: { value: 'x' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error creating operator'))
  })

  it('resets the form fields and calls onClose on cancel', () => {
    const { container, getByText } = renderWithQuery(
      <AddOperatorForm open={true} onClose={onClose} />
    )
    const labelInput = container.querySelector('#op-label') as HTMLInputElement

    fireEvent.change(labelInput, { target: { value: 'to-be-cleared' } })
    expect(labelInput.value).toBe('to-be-cleared')

    fireEvent.click(getByText('Cancel'))

    expect(onClose).toHaveBeenCalled()
    expect((container.querySelector('#op-label') as HTMLInputElement).value).toBe('')
  })
})
