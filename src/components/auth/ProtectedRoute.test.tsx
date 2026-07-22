import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from './ProtectedRoute'
import * as stores from '../../stores/auth'

vi.mock('./LoginForm', () => ({
  default: () => <div data-testid='login-form'>Login Form</div>,
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(),
}))
describe('ProtectedRoute', () => {
  it('shows login form when not authenticated', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      hasPermission: vi.fn(),
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
  it('shows fallback when not authenticated and fallback provided', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      hasPermission: vi.fn(),
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute fallback={<div>Custom Fallback</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
  })
  it('renders children when authenticated and no requirements', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'viewer' },
      hasPermission: vi.fn(),
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
  it('shows insufficient permissions when permission requirement not met', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'viewer' },
      hasPermission: vi.fn().mockReturnValue(false),
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute requiredPermission='manage:users'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument()
    expect(screen.getByText('manage:users')).toBeInTheDocument()
  })
  it('renders children when permission requirement met', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'admin' },
      hasPermission: vi.fn().mockReturnValue(true),
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute requiredPermission='manage:users'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
  it('shows resource restricted when resource access denied', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'viewer' },
      hasPermission: vi.fn(),
      canAccess: vi.fn().mockReturnValue(false),
    } as never)
    render(
      <ProtectedRoute resource='admin-panel'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Resource Restricted')).toBeInTheDocument()
    expect(screen.getByText(/admin-panel/i)).toBeInTheDocument()
  })
  it('renders children when resource access allowed', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'admin' },
      hasPermission: vi.fn(),
      canAccess: vi.fn().mockReturnValue(true),
    } as never)
    render(
      <ProtectedRoute resource='admin-panel'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
  it('checks permission requirement with hasPermission function', () => {
    const hasPermission = vi.fn().mockReturnValue(true)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'admin' },
      hasPermission,
      canAccess: vi.fn(),
    } as never)
    render(
      <ProtectedRoute requiredPermission={'write:data' as never}>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(hasPermission).toHaveBeenCalledWith('write:data')
  })
  it('checks resource access with canAccess function', () => {
    const canAccess = vi.fn().mockReturnValue(true)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'admin' },
      hasPermission: vi.fn(),
      canAccess,
    } as never)
    render(
      <ProtectedRoute resource='settings'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(canAccess).toHaveBeenCalledWith('settings')
  })
  it('applies permission and resource requirements together', () => {
    const hasPermission = vi.fn().mockReturnValue(true)
    const canAccess = vi.fn().mockReturnValue(true)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'admin' },
      hasPermission,
      canAccess,
    } as never)
    render(
      <ProtectedRoute requiredPermission={'write:data' as never} resource='settings'>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(hasPermission).toHaveBeenCalledWith('write:data')
    expect(canAccess).toHaveBeenCalledWith('settings')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
