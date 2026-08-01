import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge, Button, EmptyState, LoadingSpinner } from '../../../components/ui'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ThemeSelect } from '../../../components/ThemeSelect'
import {
  useAttachViewerToDesk,
  useDeskMembers,
  useDetachViewerFromDesk,
} from '../../../hooks/queries/desk-memberships'
import { useOperators } from '../../../hooks/queries/wallets'
import { useAuthStore } from '../../../stores/auth'
import { Permission } from '../../../types/permissions.generated'
import type { DeskMemberInfo, OperatorInfo } from '../../../types/api'

interface DeskMembershipManagementProps {
  readOnly?: boolean | undefined
}

interface DeskMembershipRemoval {
  readonly member: DeskMemberInfo
  readonly operatorPublicId: string
}

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.length > 0 ? error.message : fallback

const DeskMembershipManagement: React.FC<Readonly<DeskMembershipManagementProps>> = ({
  readOnly,
}) => {
  const { t } = useTranslation('admin')
  const hasPermission = useAuthStore(state => state.hasPermission)
  const canManage = hasPermission(Permission.MANAGE_DESK_MEMBERSHIPS)
  const [selectedDeskId, setSelectedDeskId] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [removal, setRemoval] = useState<DeskMembershipRemoval | null>(null)
  const operatorsQuery = useOperators()
  const operators: OperatorInfo[] = operatorsQuery.data?.payload ?? []
  const selectedDeskIsVisible = operators.some(operator => operator.public_id === selectedDeskId)
  const onlyOperator = operators.length === 1 ? operators[0] : undefined
  const effectiveDeskId = selectedDeskIsVisible ? selectedDeskId : (onlyOperator?.public_id ?? '')
  const membersQuery = useDeskMembers(effectiveDeskId)
  const attachMutation = useAttachViewerToDesk()
  const detachMutation = useDetachViewerFromDesk()
  const members: DeskMemberInfo[] = membersQuery.data?.payload ?? []

  if (!canManage) {
    return (
      <div className='panel'>
        <EmptyState
          icon={<Users className='h-6 w-6' />}
          title={t('deskMemberships.accessDenied.title')}
          message={t('deskMemberships.accessDenied.message')}
        />
      </div>
    )
  }

  const handleAttach = (event: React.SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (readOnly || effectiveDeskId.length === 0) return

    if (username.length === 0) {
      setUsernameError(t('deskMemberships.add.validation.usernameRequired'))

      return
    }

    setUsernameError('')
    attachMutation.mutate(
      { operatorPublicId: effectiveDeskId, username },
      {
        onSuccess: () => {
          toast.success(t('deskMemberships.toast.attached', { username }))
          setUsername('')
        },
        onError: error => {
          toast.error(errorMessage(error, t('deskMemberships.toast.attachError')))
        },
      }
    )
  }

  const handleConfirmDetach = (): void => {
    const target = removal

    setRemoval(null)
    if (readOnly || target === null) return

    detachMutation.mutate(
      { operatorPublicId: target.operatorPublicId, username: target.member.username },
      {
        onSuccess: () => {
          toast.success(t('deskMemberships.toast.detached', { username: target.member.username }))
        },
        onError: error => {
          toast.error(errorMessage(error, t('deskMemberships.toast.detachError')))
        },
      }
    )
  }

  return (
    <section className='panel space-y-5' aria-labelledby='desk-memberships-title'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 id='desk-memberships-title' className='text-2xl font-bold text-alpine-900'>
            {t('deskMemberships.title')}
          </h2>
          <p className='mt-1 text-sm text-muted-600'>{t('deskMemberships.subtitle')}</p>
        </div>
        {effectiveDeskId && !membersQuery.isLoading && !membersQuery.error && (
          <Badge variant='outline'>
            {t('deskMemberships.memberCount', { count: members.length })}
          </Badge>
        )}
      </div>

      {operatorsQuery.isLoading && (
        <div className='flex justify-center py-8'>
          <LoadingSpinner />
        </div>
      )}

      {operatorsQuery.error && (
        <div className='rounded-lg bg-loss-50 p-4 text-loss-700' role='alert'>
          {t('deskMemberships.errors.loadDesks', {
            message: errorMessage(operatorsQuery.error, t('common.unknownError')),
          })}
        </div>
      )}

      {!operatorsQuery.isLoading && !operatorsQuery.error && operators.length === 0 && (
        <EmptyState
          icon={<Users className='h-6 w-6' />}
          title={t('deskMemberships.empty.noDesks')}
          message={t('deskMemberships.empty.noDesksHint')}
        />
      )}

      {operators.length > 0 && (
        <div className='space-y-5'>
          <div className='max-w-md'>
            <label
              htmlFor='desk-membership-desk'
              className='mb-2 block text-sm font-medium text-alpine-900'
            >
              {t('deskMemberships.desk.label')}
            </label>
            <ThemeSelect
              id='desk-membership-desk'
              value={effectiveDeskId}
              onChange={setSelectedDeskId}
              options={operators.map(operator => ({
                value: operator.public_id,
                label: operator.label,
              }))}
              placeholder={t('deskMemberships.desk.placeholder')}
            />
          </div>

          <form onSubmit={handleAttach} className='rounded-xl border border-dark-600 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
              <div className='min-w-0 flex-1'>
                <label
                  htmlFor='desk-membership-username'
                  className='mb-2 block text-sm font-medium text-alpine-900'
                >
                  {t('deskMemberships.add.usernameLabel')}
                </label>
                <input
                  id='desk-membership-username'
                  type='text'
                  value={username}
                  onChange={event => {
                    setUsername(event.target.value)
                    setUsernameError('')
                  }}
                  placeholder={t('deskMemberships.add.usernamePlaceholder')}
                  className='input'
                  disabled={readOnly || attachMutation.isPending || !effectiveDeskId}
                  aria-invalid={usernameError.length > 0}
                  aria-describedby='desk-membership-username-help'
                />
                <p
                  id='desk-membership-username-help'
                  className={
                    usernameError ? 'mt-1 text-sm text-loss-600' : 'mt-1 text-xs text-muted-500'
                  }
                >
                  {usernameError || t('deskMemberships.add.usernameHint')}
                </p>
              </div>
              <Button
                type='submit'
                loading={attachMutation.isPending}
                disabled={readOnly || !effectiveDeskId}
                className='shrink-0'
              >
                <UserPlus className='h-4 w-4' />
                {t('deskMemberships.add.action')}
              </Button>
            </div>
          </form>

          {!effectiveDeskId && (
            <EmptyState
              icon={<Users className='h-6 w-6' />}
              title={t('deskMemberships.empty.selectDesk')}
              message={t('deskMemberships.empty.selectDeskHint')}
            />
          )}

          {effectiveDeskId && membersQuery.isLoading && (
            <div className='flex justify-center py-8'>
              <LoadingSpinner />
            </div>
          )}

          {effectiveDeskId && membersQuery.error && (
            <div className='rounded-lg bg-loss-50 p-4 text-loss-700' role='alert'>
              {t('deskMemberships.errors.loadMembers', {
                message: errorMessage(membersQuery.error, t('common.unknownError')),
              })}
            </div>
          )}

          {effectiveDeskId &&
            !membersQuery.isLoading &&
            !membersQuery.error &&
            members.length === 0 && (
              <EmptyState
                icon={<Users className='h-6 w-6' />}
                title={t('deskMemberships.empty.noMembers')}
                message={t('deskMemberships.empty.noMembersHint')}
              />
            )}

          {effectiveDeskId &&
            !membersQuery.isLoading &&
            !membersQuery.error &&
            members.length > 0 && (
              <div className='overflow-hidden rounded-lg border border-dark-600'>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-dark-600'>
                    <thead className='bg-dark-700'>
                      <tr>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-600'>
                          {t('deskMemberships.columns.username')}
                        </th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-600'>
                          {t('deskMemberships.columns.role')}
                        </th>
                        <th className='px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-600'>
                          {t('deskMemberships.columns.membership')}
                        </th>
                        <th className='px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-600'>
                          {t('deskMemberships.columns.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-dark-600 bg-alpine-50'>
                      {members.map(member => {
                        const isPrimary = member.primary_operator_public_id === effectiveDeskId
                        const canDetach = member.role === 'viewer'

                        return (
                          <tr key={member.public_id} className='hover:bg-dark-700'>
                            <td className='px-3 py-4 text-sm font-medium text-alpine-900'>
                              {member.username}
                            </td>
                            <td className='px-3 py-4'>
                              <Badge variant='secondary'>
                                {t(`users.form.roles.${member.role}`, {
                                  defaultValue: member.role,
                                })}
                              </Badge>
                            </td>
                            <td className='px-3 py-4'>
                              {isPrimary ? (
                                <Badge>{t('deskMemberships.primary')}</Badge>
                              ) : (
                                <span className='text-sm text-muted-500'>
                                  {t('deskMemberships.member')}
                                </span>
                              )}
                            </td>
                            <td className='px-3 py-4 text-right'>
                              {canDetach ? (
                                <Button
                                  variant='danger'
                                  size='sm'
                                  onClick={() =>
                                    setRemoval({
                                      member,
                                      operatorPublicId: effectiveDeskId,
                                    })
                                  }
                                  disabled={readOnly || detachMutation.isPending}
                                  aria-label={t('deskMemberships.remove.actionFor', {
                                    username: member.username,
                                  })}
                                >
                                  <Trash2 className='h-4 w-4' />
                                  {t('deskMemberships.remove.action')}
                                </Button>
                              ) : (
                                <span className='text-xs text-muted-500'>
                                  {t('deskMemberships.remove.viewerOnly')}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}

      <ConfirmDialog
        open={removal !== null}
        title={t('deskMemberships.remove.title')}
        message={t('deskMemberships.remove.message', {
          username: removal?.member.username ?? '',
        })}
        confirmText={t('deskMemberships.remove.confirm')}
        variant='danger'
        onConfirm={handleConfirmDetach}
        onCancel={() => setRemoval(null)}
      />
    </section>
  )
}

export default DeskMembershipManagement
