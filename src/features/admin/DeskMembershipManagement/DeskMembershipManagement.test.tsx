import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n/config'
import { makeUserProfile } from '../../../test/factories'
import DeskMembershipManagement from './DeskMembershipManagement'

interface MutationCallbacks {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

const controls = vi.hoisted(() => ({
  canManage: true,
  operatorsQuery: {
    data: undefined as unknown,
    isLoading: false,
    error: null as unknown,
  },
  membersQuery: {
    data: undefined as unknown,
    isLoading: false,
    error: null as unknown,
  },
  attachMutate: vi.fn(),
  detachMutate: vi.fn(),
  attachPending: false,
  detachPending: false,
  requestedDeskIds: [] as string[],
  successToast: vi.fn(),
  errorToast: vi.fn(),
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: (selector: (state: { hasPermission: () => boolean }) => unknown) =>
    selector({ hasPermission: () => controls.canManage }),
}))

vi.mock('../../../hooks/queries/wallets', () => ({
  useOperators: () => controls.operatorsQuery,
}))

vi.mock('../../../hooks/queries/desk-memberships', () => ({
  useDeskMembers: (operatorPublicId: string) => {
    controls.requestedDeskIds.push(operatorPublicId)

    return controls.membersQuery
  },
  useAttachViewerToDesk: () => ({
    mutate: controls.attachMutate,
    isPending: controls.attachPending,
  }),
  useDetachViewerFromDesk: () => ({
    mutate: controls.detachMutate,
    isPending: controls.detachPending,
  }),
}))

vi.mock('../../../components/ThemeSelect', () => ({
  ThemeSelect: ({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
  }: {
    id: string
    value: string
    onChange: (value: string) => void
    options: readonly { value: string; label: string }[]
    placeholder?: string
    disabled?: boolean
  }) => (
    <select
      id={id}
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value=''>{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: controls.successToast,
    error: controls.errorToast,
  },
}))

const operator = (publicId: string, label: string) => ({
  type: 'operator_info' as const,
  sequence_id: 1,
  public_id: publicId,
  timestamp: '2026-08-01T10:00:00Z',
  session_id: 'session-1',
  label,
})

const userList = (payload: ReturnType<typeof makeUserProfile>[]) => ({
  type: 'user_list' as const,
  sequence_id: 1,
  public_id: 'response-1',
  timestamp: '2026-08-01T10:00:00Z',
  session_id: 'session-1',
  payload,
  count: payload.length,
})

const setOperators = (...operators: ReturnType<typeof operator>[]): void => {
  controls.operatorsQuery.data = {
    type: 'operator_list_response',
    sequence_id: 1,
    public_id: 'response-1',
    timestamp: '2026-08-01T10:00:00Z',
    session_id: 'session-1',
    payload: operators,
    count: operators.length,
  }
}

describe('DeskMembershipManagement', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    controls.canManage = true
    controls.operatorsQuery.data = undefined
    controls.operatorsQuery.isLoading = false
    controls.operatorsQuery.error = null
    controls.membersQuery.data = userList([])
    controls.membersQuery.isLoading = false
    controls.membersQuery.error = null
    controls.attachPending = false
    controls.detachPending = false
    controls.requestedDeskIds.length = 0
    setOperators(operator('desk-1', 'Alpha desk'))
  })

  it('fails closed when the permission is absent', () => {
    controls.canManage = false

    render(<DeskMembershipManagement />)

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Desk memberships')).not.toBeInTheDocument()
  })

  it('shows desk loading, error, and empty states', () => {
    controls.operatorsQuery.data = undefined
    controls.operatorsQuery.isLoading = true
    const { rerender } = render(<DeskMembershipManagement />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Members: 0')).not.toBeInTheDocument()

    controls.operatorsQuery.isLoading = false
    controls.operatorsQuery.error = new Error('catalogue unavailable')
    rerender(<DeskMembershipManagement />)
    expect(screen.getByRole('alert')).toHaveTextContent('catalogue unavailable')

    controls.operatorsQuery.error = 'broken response'
    rerender(<DeskMembershipManagement />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown error')

    controls.operatorsQuery.error = new Error('')
    rerender(<DeskMembershipManagement />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown error')

    controls.operatorsQuery.error = null
    setOperators()
    rerender(<DeskMembershipManagement />)
    expect(screen.getByText('No desks available')).toBeInTheDocument()
  })

  it('selects one available desk automatically and renders member capabilities', () => {
    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
        primary_operator_public_id: 'desk-1',
      }),
      makeUserProfile({
        username: 'operator',
        public_id: 'user-operator',
        role: 'operator',
        operator_public_ids: ['desk-1'],
        primary_operator_public_id: null,
      }),
    ])

    render(<DeskMembershipManagement />)

    expect(screen.getByLabelText('Desk')).toHaveValue('desk-1')
    expect(controls.requestedDeskIds).toContain('desk-1')
    expect(screen.getByText('Members: 2')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove viewer from the desk' })).toBeInTheDocument()
    expect(screen.getByText('Only viewers can be removed here')).toBeInTheDocument()
  })

  it('requires an explicit selection when several desks are available', async () => {
    const user = userEvent.setup()

    setOperators(operator('desk-1', 'Alpha desk'), operator('desk-2', 'Beta desk'))
    render(<DeskMembershipManagement />)

    expect(screen.getByText('Select a desk')).toBeInTheDocument()
    const addButton = screen.getByRole('button', { name: 'Add viewer' })
    const addForm = addButton.closest('form')

    expect(addButton).toBeDisabled()
    expect(addForm).not.toBeNull()
    fireEvent.submit(addForm as HTMLFormElement)
    expect(controls.attachMutate).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText('Desk'), 'desk-2')

    expect(screen.queryByText('Select a desk')).not.toBeInTheDocument()
    expect(controls.requestedDeskIds).toContain('desk-2')
  })

  it('requires a username and preserves its exact value when attaching', async () => {
    const user = userEvent.setup()

    controls.attachMutate.mockImplementation((_target: unknown, callbacks?: MutationCallbacks) =>
      callbacks?.onSuccess?.()
    )
    render(<DeskMembershipManagement />)
    const input = screen.getByLabelText('Viewer username')

    await user.click(screen.getByRole('button', { name: 'Add viewer' }))
    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(controls.attachMutate).not.toHaveBeenCalled()

    await user.type(input, '  viewer  ')
    await user.click(screen.getByRole('button', { name: 'Add viewer' }))

    expect(controls.attachMutate).toHaveBeenCalledWith(
      { operatorPublicId: 'desk-1', username: '  viewer  ' },
      expect.any(Object)
    )
    expect(controls.successToast).toHaveBeenCalledWith('  viewer   was added to the desk')
    expect(input).toHaveValue('')
  })

  it('shows the server attachment error', async () => {
    const user = userEvent.setup()

    controls.attachMutate.mockImplementation((_target: unknown, callbacks?: MutationCallbacks) =>
      callbacks?.onError?.(new Error('Viewer not found'))
    )
    render(<DeskMembershipManagement />)

    await user.type(screen.getByLabelText('Viewer username'), 'missing')
    await user.click(screen.getByRole('button', { name: 'Add viewer' }))

    expect(controls.errorToast).toHaveBeenCalledWith('Viewer not found')
  })

  it('confirms removal with session impact and reports success', async () => {
    const user = userEvent.setup()

    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
      }),
    ])
    controls.detachMutate.mockImplementation((_target: unknown, callbacks?: MutationCallbacks) =>
      callbacks?.onSuccess?.()
    )
    render(<DeskMembershipManagement />)

    await user.click(screen.getByRole('button', { name: 'Remove viewer from the desk' }))
    expect(screen.getByText(/active sessions will be terminated/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove member' }))

    expect(controls.detachMutate).toHaveBeenCalledWith(
      { operatorPublicId: 'desk-1', username: 'viewer' },
      expect.any(Object)
    )
    expect(controls.successToast).toHaveBeenCalledWith('viewer was removed from the desk')
  })

  it('keeps the confirmed removal bound to the desk where it was opened', async () => {
    const user = userEvent.setup()

    setOperators(operator('desk-1', 'Alpha desk'), operator('desk-2', 'Beta desk'))
    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
      }),
    ])
    render(<DeskMembershipManagement />)

    await user.selectOptions(screen.getByLabelText('Desk'), 'desk-1')
    await user.click(screen.getByRole('button', { name: 'Remove viewer from the desk' }))
    await user.selectOptions(screen.getByLabelText('Desk'), 'desk-2')
    await user.click(screen.getByRole('button', { name: 'Remove member' }))

    expect(controls.detachMutate).toHaveBeenCalledWith(
      { operatorPublicId: 'desk-1', username: 'viewer' },
      expect.any(Object)
    )
  })

  it('blocks a pending removal when time travel starts before confirmation', async () => {
    const user = userEvent.setup()

    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
      }),
    ])
    const { rerender } = render(<DeskMembershipManagement />)

    await user.click(screen.getByRole('button', { name: 'Remove viewer from the desk' }))
    rerender(<DeskMembershipManagement readOnly />)
    await user.click(screen.getByRole('button', { name: 'Remove member' }))

    expect(controls.detachMutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Remove member' })).not.toBeInTheDocument()
  })

  it('can cancel removal and reports a detach error', async () => {
    const user = userEvent.setup()

    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
      }),
    ])
    controls.detachMutate.mockImplementation((_target: unknown, callbacks?: MutationCallbacks) =>
      callbacks?.onError?.(new Error('Detach rejected'))
    )
    render(<DeskMembershipManagement />)

    await user.click(screen.getByRole('button', { name: 'Remove viewer from the desk' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(controls.detachMutate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove viewer from the desk' }))
    await user.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(controls.errorToast).toHaveBeenCalledWith('Detach rejected')
  })

  it('renders member loading, error, and empty states', () => {
    controls.membersQuery.data = undefined
    controls.membersQuery.isLoading = true
    const { rerender } = render(<DeskMembershipManagement />)

    expect(screen.getByRole('status')).toBeInTheDocument()

    controls.membersQuery.isLoading = false
    controls.membersQuery.error = new Error('members unavailable')
    rerender(<DeskMembershipManagement />)
    expect(screen.getByRole('alert')).toHaveTextContent('members unavailable')
    expect(screen.queryByText('Members: 0')).not.toBeInTheDocument()

    controls.membersQuery.error = null
    rerender(<DeskMembershipManagement />)
    expect(screen.getByText('No active members')).toBeInTheDocument()
    expect(screen.getByText('Members: 0')).toBeInTheDocument()
  })

  it('disables membership mutations in time travel mode', () => {
    controls.membersQuery.data = userList([
      makeUserProfile({
        username: 'viewer',
        public_id: 'user-viewer',
        role: 'viewer',
        operator_public_ids: ['desk-1'],
      }),
    ])

    const { container } = render(<DeskMembershipManagement readOnly />)

    expect(screen.getByLabelText('Viewer username')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add viewer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove viewer from the desk' })).toBeDisabled()
    const form = container.querySelector('form')

    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)
    expect(controls.attachMutate).not.toHaveBeenCalled()
  })
})
