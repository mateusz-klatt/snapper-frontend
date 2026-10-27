import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from './Settings'
import { makeSettingRead } from '../../test/factories'

type UpdateSetting = (
  key: string,
  value: string,
  category: string,
  description: string
) => Promise<void>

const controls = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  onUpdate: undefined as UpdateSetting | undefined,
  onCreate: undefined as UpdateSetting | undefined,
  onDelete: undefined as ((key: string) => Promise<void>) | undefined,
}))

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({ hasPermission: () => false }),
}))
vi.mock('../../hooks/queries/settings', () => ({
  useSettings: () => ({ data: [makeSettingRead({ key: 'system.mode', value: 'paper' })] }),
  useSettingCategories: () => ({ data: [] }),
  useUpdateSetting: () => ({ mutateAsync: controls.update }),
  useDeleteSetting: () => ({ mutateAsync: controls.remove }),
}))
vi.mock('./SettingItem', () => ({
  SettingItem: ({
    onUpdate,
    onDelete,
  }: {
    onUpdate: UpdateSetting
    onDelete: (key: string) => Promise<void>
  }) => {
    controls.onUpdate = onUpdate
    controls.onDelete = onDelete

    return <div>Setting preview</div>
  },
}))
vi.mock('./AddSettingModal', () => ({
  AddSettingModal: ({ onSave }: { onSave: UpdateSetting }) => {
    controls.onCreate = onSave

    return null
  },
}))

describe('read-only settings callbacks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects mutation callbacks retained by read-only setting forms', async () => {
    render(<Settings />)
    expect(screen.getByText('Setting preview')).toBeInTheDocument()
    await act(async () => {
      await controls.onUpdate?.('system.mode', 'changed', 'system', '')
      await controls.onCreate?.('new.setting', 'changed', 'system', '')
      await controls.onDelete?.('system.mode')
    })
    expect(controls.update).not.toHaveBeenCalled()
    expect(controls.remove).not.toHaveBeenCalled()
  })
})
