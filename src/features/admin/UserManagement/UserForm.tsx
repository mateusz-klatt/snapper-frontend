import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { ThemeSelect } from '../../../components/ThemeSelect'
import { AdminPasswordField, AdminTextField } from '../components/AdminFormFields'
import { AdminFormModal } from '../components/AdminFormModal'
import { useCreateUser, useUpdateUser, useAdminResetPassword } from '../../../hooks/queries/users'
import type { UserProfile, UserRole } from '../../../types/api'

interface UserFormProps {
  user?: UserProfile | undefined
  open: boolean
  onClose: () => void
  readOnly?: boolean | undefined
}

const UserForm: React.FC<Readonly<UserFormProps>> = ({ user, open, onClose, readOnly }) => {
  const { t } = useTranslation('admin')
  const [formData, setFormData] = useState<{
    username: string
    password: string
    email: string
    role: UserRole
    is_active: boolean
  }>({
    username: user?.username || '',
    password: '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    is_active: user?.is_active ?? true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [resetPassword, setResetPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        email: user.email ?? '',
        role: user.role,
        is_active: user.is_active,
      })
    } else {
      setFormData({
        username: '',
        password: '',
        email: '',
        role: 'viewer',
        is_active: true,
      })
    }

    setErrors({})
    setResetPassword(false)
  }, [user])
  const isEditing = !!user
  const isDelegate = user?.role === 'ai_delegate'
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const resetPasswordMutation = useAdminResetPassword()
  const createUserMutation = {
    mutate: (data: {
      username: string
      password: string
      email: string
      role: UserRole
      is_active: boolean
    }) => {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success(t('users.form.toast.created'))
          onClose()
        },
        onError: (err: Error) => toast.error(err.message || t('users.form.toast.createError')),
      })
    },
    isPending: createMutation.isPending,
  }
  const updateUserMutation = {
    mutate: (data: { email: string; role: UserRole; is_active: boolean }) => {
      updateMutation.mutate(
        { userId: formData.username, data },
        {
          onSuccess: () => {
            toast.success(t('users.form.toast.updated'))
            onClose()
          },
          onError: (err: Error) => toast.error(err.message || t('users.form.toast.updateError')),
        }
      )
    },
    isPending: updateMutation.isPending,
  }
  const adminResetPasswordMutation = {
    mutate: (data: { new_password: string }) => {
      resetPasswordMutation.mutate(
        { userId: formData.username, data },
        {
          onSuccess: () => {
            toast.success(t('users.form.toast.passwordReset'))
            onClose()
          },
          onError: (err: Error) => toast.error(err.message || t('users.form.toast.resetError')),
        }
      )
    },
    isPending: resetPasswordMutation.isPending,
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = t('users.form.validation.usernameRequired')
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('users.form.validation.usernameMinLength')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('users.form.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(formData.email)) {
      newErrors.email = t('users.form.validation.emailInvalid')
    }

    if (!isEditing && !formData.password) {
      newErrors.password = t('users.form.validation.passwordRequired')
    } else if (!isEditing && formData.password.length < 8) {
      newErrors.password = t('users.form.validation.passwordMinLength')
    } else if (isEditing && resetPassword && !formData.password) {
      newErrors.password = t('users.form.validation.passwordRequiredWhenResetting')
    } else if (isEditing && resetPassword && formData.password.length < 8) {
      newErrors.password = t('users.form.validation.passwordMinLength')
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (user) {
      const profileChanged =
        formData.email !== (user.email ?? '') ||
        formData.role !== user.role ||
        formData.is_active !== user.is_active

      if (resetPassword && profileChanged) {
        updateMutation.mutate(
          {
            userId: formData.username,
            data: {
              email: formData.email,
              role: formData.role,
              is_active: formData.is_active,
            },
          },
          {
            onSuccess: () =>
              resetPasswordMutation.mutate(
                { userId: formData.username, data: { new_password: formData.password } },
                {
                  onSuccess: () => {
                    toast.success(t('users.form.toast.updated'))
                    onClose()
                  },
                  onError: (err: Error) =>
                    toast.error(err.message || t('users.form.toast.resetError')),
                }
              ),
            onError: (err: Error) => toast.error(err.message || t('users.form.toast.updateError')),
          }
        )
      } else if (resetPassword) {
        adminResetPasswordMutation.mutate({
          new_password: formData.password,
        })
      } else {
        updateUserMutation.mutate({
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        })
      }
    } else {
      createUserMutation.mutate({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      })
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const isPending =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    adminResetPasswordMutation.isPending

  return (
    <AdminFormModal
      open={open}
      onClose={onClose}
      title={isEditing ? t('users.form.titleEdit') : t('users.form.titleAdd')}
      size='md'
      onSubmit={handleSubmit}
      readOnly={readOnly}
      isPending={isPending}
      cancelLabel={t('common.cancel')}
      submitLabel={
        isEditing ? t('users.form.actions.saveChanges') : t('users.form.actions.createUser')
      }
    >
      <AdminTextField
        id='username'
        type='text'
        label={t('users.form.fields.username')}
        value={formData.username}
        onChange={value => handleInputChange('username', value)}
        disabled={isEditing}
        className={isEditing ? 'bg-muted-100 cursor-not-allowed bg-muted-100' : ''}
        placeholder={t('users.form.fields.usernamePlaceholder')}
        error={errors.username}
      />
      {isEditing && (
        <div>
          <div className='flex items-center space-x-2 mb-3'>
            <input
              type='checkbox'
              id='resetPassword'
              checked={resetPassword}
              onChange={e => setResetPassword(e.target.checked)}
              className='rounded border-alpine-200 text-brand-600 focus:ring-brand-500'
            />
            <label htmlFor='resetPassword' className='text-sm font-medium text-alpine-900'>
              {t('users.form.fields.resetUserPassword')}
            </label>
          </div>
          {resetPassword && (
            <AdminPasswordField
              id='password'
              label={t('users.form.fields.newPassword')}
              value={formData.password}
              onChange={value => handleInputChange('password', value)}
              placeholder={t('users.form.fields.newPasswordPlaceholder')}
              visible={showPassword}
              onToggleVisible={() => setShowPassword(!showPassword)}
              error={errors.password}
            />
          )}
        </div>
      )}
      {!isEditing && (
        <AdminPasswordField
          id='password'
          label={t('users.form.fields.password')}
          value={formData.password}
          onChange={value => handleInputChange('password', value)}
          placeholder={t('users.form.fields.passwordPlaceholder')}
          visible={showPassword}
          onToggleVisible={() => setShowPassword(!showPassword)}
          error={errors.password}
        />
      )}
      <AdminTextField
        id='email'
        type='email'
        label={t('users.form.fields.email')}
        value={formData.email}
        onChange={value => handleInputChange('email', value)}
        placeholder={t('users.form.fields.emailPlaceholder')}
        error={errors.email}
      />
      <div>
        <label htmlFor='role' className='block text-sm font-medium text-alpine-900 mb-2'>
          {t('users.form.fields.role')}
        </label>
        {isDelegate ? (
          <input
            type='text'
            id='role'
            value={t('users.form.roles.ai_delegate')}
            disabled
            readOnly
            className='w-full rounded-md border border-dark-600 bg-muted-100 px-3 py-2 text-alpine-900 shadow-sm cursor-not-allowed'
          />
        ) : (
          <ThemeSelect
            id='role'
            value={formData.role}
            onChange={val => handleInputChange('role', val)}
            options={[
              { value: 'viewer', label: t('users.form.roles.viewer') },
              { value: 'operator', label: t('users.form.roles.operator') },
              { value: 'admin', label: t('users.form.roles.admin') },
            ]}
          />
        )}
      </div>
      <div className='flex items-center'>
        <input
          type='checkbox'
          id='is_active'
          checked={formData.is_active}
          onChange={e => handleInputChange('is_active', e.target.checked)}
          className='h-4 w-4 text-brand-600 focus:ring-brand-500 border-dark-600 rounded'
        />
        <label htmlFor='is_active' className='ml-2 block text-sm text-alpine-900'>
          {t('users.form.fields.accountActive')}
        </label>
      </div>
    </AdminFormModal>
  )
}

export default UserForm
