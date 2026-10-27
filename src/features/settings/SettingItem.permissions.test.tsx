import type { ComponentProps } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import { makeSettingRead } from '../../test/factories'
import { renderWithI18n } from '../../test/renderWithI18n'
import { SettingItem } from './SettingItem'

type SettingItemProps = ComponentProps<typeof SettingItem>

const makeProps = (key: string, value: string) => ({
  setting: makeSettingRead({ key, value }),
  onUpdate: vi.fn<SettingItemProps['onUpdate']>().mockResolvedValue(undefined),
  onDelete: vi.fn<SettingItemProps['onDelete']>().mockResolvedValue(undefined),
  isSaving: false,
})

describe('read-only setting previews', () => {
  it.each([
    ['plain text', 'example-sensitive-value'],
    ['JSON object', '{"token":"example-sensitive-value"}'],
    ['JSON string', '"example-sensitive-value"'],
    ['encrypted text', `gAAAAAB${'x'.repeat(40)}`],
  ])('preserves the sensitive mask when opening %s', (_format, value) => {
    const props = makeProps('auth.api_key', value)

    renderWithI18n(<SettingItem {...props} readOnly />)
    expect(screen.getByText('••••••••')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const editor = screen.getByRole('textbox')

    expect(editor).toHaveValue('••••••••')
    expect(editor).toHaveAttribute('readonly')
    expect(screen.queryByDisplayValue(value)).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('example-sensitive-value')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('example-sensitive-value')
    expect(screen.queryByRole('button', { name: 'Raw JSON' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(props.onUpdate).not.toHaveBeenCalled()
    expect(props.onDelete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('••••••••')).toBeInTheDocument()
  })

  it('preserves the empty-value presentation for sensitive settings', () => {
    const props = makeProps('auth.api_key', '')

    renderWithI18n(<SettingItem {...props} readOnly />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('textbox')).toHaveValue('(empty)')
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
    expect(props.onUpdate).not.toHaveBeenCalled()
  })

  it.each(['plain text', 'raw JSON'])(
    'remasks an open %s editor when write access is lost',
    format => {
      const value =
        format === 'raw JSON' ? '{"token":"example-sensitive-value"}' : 'example-sensitive-value'
      const props = makeProps('auth.credentials', value)
      const { rerender } = renderWithI18n(<SettingItem {...props} readOnly={false} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      if (format === 'raw JSON') {
        fireEvent.click(screen.getByRole('button', { name: 'Raw JSON' }))
      }

      const editor = screen.getByRole('textbox')

      expect((editor as HTMLTextAreaElement).value).toContain('example-sensitive-value')
      fireEvent.change(editor, { target: { value: 'unsaved-sensitive-value' } })
      rerender(
        <I18nextProvider i18n={i18n}>
          <SettingItem {...props} readOnly />
        </I18nextProvider>
      )

      expect(screen.getByRole('textbox')).toHaveValue('••••••••')
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
      expect(document.body).not.toHaveTextContent('example-sensitive-value')
      expect(document.body).not.toHaveTextContent('unsaved-sensitive-value')
      expect(screen.queryByRole('button', { name: 'Raw JSON' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
      expect(props.onUpdate).not.toHaveBeenCalled()
    }
  )

  it('keeps nonsensitive JSON inspectable in structured and raw modes', () => {
    const value = { host: 'example.test', retries: 3 }
    const props = makeProps('app.config', JSON.stringify(value))

    renderWithI18n(<SettingItem {...props} readOnly />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByDisplayValue('example.test')).toHaveAttribute('readonly')
    fireEvent.click(screen.getByRole('button', { name: 'Raw JSON' }))

    expect(screen.getByRole('textbox')).toHaveValue(JSON.stringify(value, null, 2))
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(props.onUpdate).not.toHaveBeenCalled()
  })
})
