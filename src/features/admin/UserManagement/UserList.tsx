import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Edit, UserPlus, Eye, EyeOff, Shield, Users, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button, Badge } from '../../../components/ui'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useUsers, useDeactivateUser } from '../../../hooks/queries/users'
import { formatDateTime } from '../../../lib/dateFormat'
import { useAppStore } from '../../../stores/app'
import type { UserProfile } from '../../../types/api'

interface UserListProps {
  onCreateUser: () => void
  onEditUser: (user: UserProfile) => void
  readOnly?: boolean | undefined
}

const UserList: React.FC<Readonly<UserListProps>> = ({ onCreateUser, onEditUser, readOnly }) => {
  const { t } = useTranslation('admin')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const { data: userListData, isLoading, error } = useUsers(includeInactive)
  const deactivateMutation = useDeactivateUser()
  const deleteUserMutation = {
    mutate: (userId: string) => {
      deactivateMutation.mutate(userId, {
        onSuccess: () => toast.success(t('users.list.toast.deactivated')),
        onError: (err: Error) => toast.error(err.message || t('users.list.toast.deactivateError')),
      })
    },
    isPending: deactivateMutation.isPending,
  }

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user)
  }

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-loss-100 text-loss-800 border-loss-200'
      case 'operator':
        return 'bg-brand-100 text-brand-800 border-brand-200'
      case 'viewer':
        return 'bg-muted-200 text-muted-700 border-muted-300'
      case 'ai_delegate':
        return 'bg-accent-100 text-accent-800 border-accent-200'
      default:
        return 'bg-muted-200 text-muted-700 border-muted-300'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className='w-3 h-3' />
      case 'operator':
        return <Users className='w-3 h-3' />
      case 'viewer':
        return <Eye className='w-3 h-3' />
      case 'ai_delegate':
        return <Sparkles className='w-3 h-3' />
      default:
        return null
    }
  }

  const locale = useAppStore(s => s.locale)
  const formatDate = (dateString: string): string => formatDateTime(new Date(dateString), locale)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : t('common.unknownError')

    return (
      <div className='p-4 text-loss-600 bg-loss-50 rounded-lg'>
        {t('users.list.errorLoading', { message: errorMessage })}
      </div>
    )
  }

  const allUsers = userListData?.payload || []
  const users = allUsers.filter(user => {
    if (searchTerm === '') return true
    const term = searchTerm.toLowerCase()

    return (
      user.username.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    )
  })

  return (
    <div className='space-y-4'>
      {}
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center space-x-4'>
          <h2 className='text-2xl font-bold text-alpine-900'>{t('users.list.title')}</h2>
          <Badge variant='outline' className='text-sm'>
            {t('users.list.countLabel', { count: userListData?.count || 0 })}
          </Badge>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setIncludeInactive(!includeInactive)}
            className='flex items-center space-x-2'
          >
            {includeInactive ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
            <span>
              {includeInactive ? t('users.list.hideInactive') : t('users.list.showInactive')}
            </span>
          </Button>
          <Button
            onClick={onCreateUser}
            disabled={readOnly}
            className='flex items-center space-x-2'
          >
            <UserPlus className='w-4 h-4' />
            <span>{t('users.list.addUser')}</span>
          </Button>
        </div>
      </div>
      {}
      <div>
        <input
          type='text'
          placeholder={t('users.list.searchPlaceholder')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='input'
        />
      </div>
      {}
      <div className='md:hidden space-y-3'>
        {users.map(user => (
          <div key={user.username} className='bg-alpine-50 border border-dark-600 rounded-lg p-3'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <div className='text-sm font-medium text-alpine-900'>{user.username}</div>
                <div className='text-xs text-muted-500 truncate'>{user.email}</div>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => onEditUser(user)}
                  disabled={readOnly}
                  className='text-brand-600 hover:text-brand-900'
                >
                  <Edit className='w-4 h-4' />
                </Button>
                <Button
                  variant='danger'
                  size='sm'
                  onClick={() => handleDeleteUser(user)}
                  disabled={deleteUserMutation.isPending || readOnly}
                  className='text-loss-600 hover:text-loss-900'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </div>
            <div className='flex items-center gap-2 mt-2'>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}
              >
                {getRoleIcon(user.role)}
                <span className='capitalize'>
                  {t(`users.form.roles.${user.role}`, { defaultValue: user.role })}
                </span>
              </span>
              <span
                className={
                  user.is_active
                    ? 'inline-flex items-center rounded-full border border-accent-200 bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-800'
                    : 'inline-flex items-center rounded-full border border-muted-300 bg-muted-200 px-2 py-0.5 text-xs font-medium text-muted-700'
                }
              >
                {user.is_active ? t('users.list.status.active') : t('users.list.status.inactive')}
              </span>
            </div>
          </div>
        ))}
      </div>
      {}
      <div className='hidden md:block bg-alpine-50 shadow-sm rounded-lg border border-dark-600 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-dark-600'>
            <thead className='bg-dark-700'>
              <tr>
                <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                  {t('users.list.columns.user')}
                </th>
                <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                  {t('users.list.columns.role')}
                </th>
                <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                  {t('users.list.columns.status')}
                </th>
                <th className='hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                  {t('users.list.columns.createdAt')}
                </th>
                <th className='px-3 py-3 text-right text-xs font-medium text-muted-600 uppercase tracking-wider'>
                  {t('users.list.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className='bg-alpine-50 divide-y divide-dark-600'>
              {users.map(user => (
                <tr key={user.username} className='hover:bg-dark-700'>
                  <td className='px-3 py-4 whitespace-nowrap'>
                    <div>
                      <div className='text-sm font-medium text-alpine-900'>{user.username}</div>
                      <div className='text-sm text-muted-500'>{user.email}</div>
                    </div>
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap'>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className='capitalize'>
                        {t(`users.form.roles.${user.role}`, { defaultValue: user.role })}
                      </span>
                    </span>
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap'>
                    <span
                      className={
                        user.is_active
                          ? 'inline-flex items-center rounded-full border border-accent-200 bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-800'
                          : 'inline-flex items-center rounded-full border border-muted-300 bg-muted-200 px-2.5 py-0.5 text-xs font-medium text-muted-700'
                      }
                    >
                      {user.is_active
                        ? t('users.list.status.active')
                        : t('users.list.status.inactive')}
                    </span>
                  </td>
                  <td className='hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-muted-500'>
                    {user.created_at ? formatDate(user.created_at) : t('users.list.unknown')}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => onEditUser(user)}
                      disabled={readOnly}
                      className='text-brand-600 hover:text-brand-900'
                    >
                      <Edit className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='danger'
                      size='sm'
                      onClick={() => handleDeleteUser(user)}
                      disabled={deleteUserMutation.isPending || readOnly}
                      className='text-loss-600 hover:text-loss-900'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {users.length === 0 && (
        <div className='text-center py-12'>
          <Users className='mx-auto h-12 w-12 text-muted-400' />
          <h3 className='mt-2 text-sm font-medium text-alpine-900'>
            {t('users.list.empty.title')}
          </h3>
          <p className='mt-1 text-sm text-muted-500'>
            {searchTerm && t('users.list.empty.noMatch')}
            {!searchTerm && includeInactive && t('users.list.empty.noUsers')}
            {!searchTerm && !includeInactive && t('users.list.empty.noActive')}
          </p>
        </div>
      )}
      {}
      <ConfirmDialog
        open={userToDelete !== null}
        title={t('users.list.deactivate.title')}
        message={t('users.list.deactivate.message', {
          username: userToDelete?.username ?? '',
        })}
        confirmText={t('users.list.deactivate.confirm')}
        variant='danger'
        onConfirm={() => {
          deleteUserMutation.mutate((userToDelete as UserProfile).username)
          setUserToDelete(null)
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  )
}

export default UserList
