import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin'

vi.mock('./UserManagement/UserManagement', () => ({
  default: () => <div data-testid='user-management'>User Management</div>,
}))
vi.mock('./ScopeGrantManagement/ScopeGrantManagement', () => ({
  default: () => <div data-testid='scope-grant-management'>Scope Grants</div>,
}))
vi.mock('./CredentialManagement/CredentialManagement', () => ({
  default: () => <div data-testid='credential-management'>Credentials</div>,
}))
describe('Admin', () => {
  it('renders admin page header', () => {
    render(<Admin />)
    expect(screen.getByText('Administration')).toBeInTheDocument()
    expect(screen.getByText(/Manage users and system configuration/i)).toBeInTheDocument()
  })
  it.each([
    ['renders user management component', 'user-management'],
    ['renders scope grant management component', 'scope-grant-management'],
    ['renders credential management component', 'credential-management'],
  ])('%s', (_name, testId) => {
    render(<Admin />)
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })
  it('applies correct styling classes', () => {
    const { container } = render(<Admin />)
    const mainDiv = container.firstChild as HTMLElement

    expect(mainDiv).toHaveClass('space-y-6')
  })
  it('has proper heading hierarchy', () => {
    render(<Admin />)
    const heading = screen.getByRole('heading', { level: 1 })

    expect(heading).toHaveTextContent('Administration')
  })
  it('expands and collapses role permissions panel', async () => {
    const user = userEvent.setup()

    render(<Admin />)
    expect(screen.getByText('Role Permissions')).toBeInTheDocument()
    expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    const toggleButton = screen.getByText('Role Permissions').closest('button') as HTMLButtonElement

    await user.click(toggleButton)
    expect(screen.getAllByText('Viewer').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Operator').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Market Data')).toBeInTheDocument()
    expect(screen.getByText('Processes')).toBeInTheDocument()
    expect(screen.getByText('Strategies')).toBeInTheDocument()
    expect(screen.getByText('Orders & Fills')).toBeInTheDocument()
    expect(screen.getByText('Positions')).toBeInTheDocument()
    expect(screen.getByText('Signals')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText(/read-only operator/i)).toBeInTheDocument()
    const processRow = screen.getByText('Processes').closest('tr')
    const settingsRow = screen.getByText('Settings').closest('tr')

    expect(processRow).not.toBeNull()
    expect(settingsRow).not.toBeNull()
    const processCells = within(processRow as HTMLElement).getAllByRole('cell')
    const settingsCells = within(settingsRow as HTMLElement).getAllByRole('cell')

    expect(processCells[1]).toHaveTextContent('✓')
    expect(processCells[2]).toHaveTextContent('✓')
    expect(processCells[3]).toHaveTextContent('✓')
    expect(settingsCells[1]).toHaveTextContent('—')
    expect(settingsCells[2]).toHaveTextContent('—')
    expect(settingsCells[3]).toHaveTextContent('✓')
    await user.click(toggleButton)
    expect(screen.queryByText(/read-only operator/i)).not.toBeInTheDocument()
  })
})
