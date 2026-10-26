import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserManagement from './UserManagement'
import * as authStore from '../../../stores/auth'

vi.mock('./UserList', () => ({
  default: ({
    onCreateUser,
    onEditUser,
    readOnly,
  }: {
    onCreateUser: () => void
    onEditUser: (user: never) => void
    readOnly?: boolean
  }) => (
    <div data-testid='user-list' data-readonly={readOnly}>
      <button onClick={onCreateUser}>Create User</button>
      <button
        onClick={() =>
          onEditUser({
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'admin',
          } as never)
        }
      >
        Edit User
      </button>
    </div>
  ),
}))
vi.mock('./UserForm', () => ({
  default: ({
    open,
    onClose,
    user,
    readOnly,
  }: {
    open: boolean
    onClose: () => void
    user?: { username: string }
    readOnly?: boolean
  }) => (
    <div data-testid='user-form' data-open={open} data-readonly={readOnly}>
      {user ? `Editing ${user.username}` : 'Creating new user'}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))
describe('UserManagement', () => {
  it('allows a read-only user to inspect the edit form without write access', async () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: (permission: string) => permission === 'read:users',
    } as never)
    render(<UserManagement />)
    expect(screen.getByTestId('user-list')).toHaveAttribute('data-readonly', 'true')
    await userEvent.click(screen.getByText('Edit User'))
    expect(screen.getByTestId('user-form')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('user-form')).toHaveAttribute('data-readonly', 'true')
  })
  it('preserves inherited read-only mode for a user manager', () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: () => true,
    } as never)
    render(<UserManagement readOnly />)
    expect(screen.getByTestId('user-form')).toHaveAttribute('data-readonly', 'true')
  })
  it('shows access denied when user lacks permission', () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
    } as never)
    render(<UserManagement />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText(/don't have permission to manage users/i)).toBeInTheDocument()
  })
  it('renders user list when user has permission', () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    expect(screen.getByTestId('user-list')).toBeInTheDocument()
  })
  it('does not show user form initially', () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    const form = screen.getByTestId('user-form')

    expect(form).toHaveAttribute('data-open', 'false')
  })
  it('opens user form for creating user', async () => {
    const user = userEvent.setup()

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    await user.click(screen.getByText('Create User'))
    const form = screen.getByTestId('user-form')

    expect(form).toHaveAttribute('data-open', 'true')
    expect(form).toHaveTextContent('Creating new user')
  })
  it('opens user form for editing user', async () => {
    const user = userEvent.setup()

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    await user.click(screen.getByText('Edit User'))
    const form = screen.getByTestId('user-form')

    expect(form).toHaveAttribute('data-open', 'true')
    expect(form).toHaveTextContent('Editing testuser')
  })
  it('closes user form when close is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    await user.click(screen.getByText('Create User'))
    const form = screen.getByTestId('user-form')

    expect(form).toHaveAttribute('data-open', 'true')
    await user.click(screen.getByText('Close'))
    expect(form).toHaveAttribute('data-open', 'false')
  })
  it('resets editing user when opening create form', async () => {
    const user = userEvent.setup()

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
    } as never)
    render(<UserManagement />)
    await user.click(screen.getByText('Edit User'))
    expect(screen.getByText('Editing testuser')).toBeInTheDocument()
    await user.click(screen.getByText('Close'))
    await user.click(screen.getByText('Create User'))
    const form = screen.getByTestId('user-form')

    expect(form).toHaveTextContent('Creating new user')
  })
  it('checks manage:users permission', () => {
    const hasPermission = vi.fn().mockReturnValue(true)

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      hasPermission,
    } as never)
    render(<UserManagement />)
    expect(hasPermission).toHaveBeenCalledWith('manage:users')
  })
})
