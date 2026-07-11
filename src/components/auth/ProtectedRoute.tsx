import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../stores/auth'
import type { Permission } from '../../types/permissions.generated'
import LoginForm from './LoginForm'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'viewer' | 'operator' | 'admin'
  requiredPermission?: Permission
  resource?: string
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<Readonly<ProtectedRouteProps>> = ({
  children,
  requiredRole,
  requiredPermission,
  resource,
  fallback,
}) => {
  const { isAuthenticated, user, hasRole, hasPermission, canAccess } = useAuth()
  const { t } = useTranslation('auth')

  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className='min-h-screen flex items-center justify-center bg-alpine-100 dark:bg-dark-900 px-4'>
        <LoginForm />
      </div>
    )
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-alpine-100 dark:bg-dark-900 px-4'>
        <div className='text-center'>
          <div className='text-6xl mb-4'>🚫</div>
          <h1 className='text-2xl font-bold text-alpine-900 dark:text-white mb-2'>
            {t('errors.accessDenied.title')}
          </h1>
          <p className='text-muted-600 dark:text-muted-600 mb-4'>
            {t('errors.accessDenied.message', { role: requiredRole })}
          </p>
          <p className='text-sm text-muted-500 dark:text-muted-500'>
            {t('errors.currentRoleLabel')} <span className='font-medium'>{user.role}</span>
          </p>
        </div>
      </div>
    )
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-alpine-100 dark:bg-dark-900 px-4'>
        <div className='text-center'>
          <div className='text-6xl mb-4'>🔒</div>
          <h1 className='text-2xl font-bold text-alpine-900 dark:text-white mb-2'>
            {t('errors.insufficientPermissions.title')}
          </h1>
          <p className='text-muted-600 dark:text-muted-600 mb-4'>
            {t('errors.insufficientPermissions.message')} <code>{requiredPermission}</code>
          </p>
          <p className='text-sm text-muted-500 dark:text-muted-500'>
            {t('errors.currentRoleLabel')} <span className='font-medium'>{user.role}</span>
          </p>
        </div>
      </div>
    )
  }

  if (resource && !canAccess(resource)) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-alpine-100 dark:bg-dark-900 px-4'>
        <div className='text-center'>
          <div className='text-6xl mb-4'>🚪</div>
          <h1 className='text-2xl font-bold text-alpine-900 dark:text-white mb-2'>
            {t('errors.resourceRestricted.title')}
          </h1>
          <p className='text-muted-600 dark:text-muted-600 mb-4'>
            {t('errors.resourceRestricted.message')} <code>{resource}</code>
          </p>
          <p className='text-sm text-muted-500 dark:text-muted-500'>
            {t('errors.currentRoleLabel')} <span className='font-medium'>{user.role}</span>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
