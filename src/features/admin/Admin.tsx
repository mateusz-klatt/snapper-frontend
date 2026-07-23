import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Shield, Users, Eye } from 'lucide-react'
import {
  RESOURCE_PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from '../../types/permissions.generated'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import UserManagement from './UserManagement/UserManagement'
import ScopeGrantManagement from './ScopeGrantManagement/ScopeGrantManagement'
import CredentialManagement from './CredentialManagement/CredentialManagement'

const TAB_KEYS = [
  'overview',
  'market',
  'processes',
  'strategies',
  'orders',
  'positions',
  'signals',
  'health',
  'admin',
  'settings',
] as const

type MatrixRole = 'viewer' | 'operator' | 'admin'
type MatrixResource = (typeof TAB_KEYS)[number]

const roleCanAccessResource = (role: MatrixRole, resource: MatrixResource): boolean => {
  const requirements = RESOURCE_PERMISSIONS[resource] as readonly Permission[]

  if (requirements.length === 0) return true
  const rolePermissions = ROLE_PERMISSIONS[role]

  return requirements.some(permission => rolePermissions.includes(permission))
}

const ACCESS_MARKS = [
  { className: 'text-muted-400', symbol: '—' },
  { className: 'text-accent-600', symbol: '✓' },
] as const

function AccessMark({ granted }: Readonly<{ granted: boolean }>): React.ReactElement {
  const mark = ACCESS_MARKS[Number(granted) as 0 | 1]

  return <span className={mark.className}>{mark.symbol}</span>
}

export const Admin: React.FC = () => {
  const readOnly = useIsReadOnly()
  const [showRoleInfo, setShowRoleInfo] = useState(false)
  const { t } = useTranslation('admin')

  const rolePermissions = TAB_KEYS.map(tabId => {
    return {
      resource: t(`rolePermissions.resources.${tabId}`),
      viewer: roleCanAccessResource('viewer', tabId),
      operator: roleCanAccessResource('operator', tabId),
      admin: roleCanAccessResource('admin', tabId),
    }
  })

  return (
    <div className='space-y-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-alpine-900 mb-2'>{t('page.title')}</h1>
        <p className='text-muted-600'>{t('page.subtitle')}</p>
      </div>
      {}
      <div className='panel'>
        <button
          type='button'
          onClick={() => setShowRoleInfo(prev => !prev)}
          className='flex w-full items-center justify-between text-left'
        >
          <h2 className='text-lg font-semibold text-alpine-900'>{t('rolePermissions.title')}</h2>
          {showRoleInfo ? (
            <ChevronUp size={20} className='text-muted-500' />
          ) : (
            <ChevronDown size={20} className='text-muted-500' />
          )}
        </button>
        {showRoleInfo && (
          <div className='mt-4 space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='border border-dark-600 rounded-xl p-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Eye size={16} className='text-accent-600' />
                  <h3 className='font-medium text-alpine-900'>
                    {t('rolePermissions.viewer.label')}
                  </h3>
                </div>
                <p className='text-xs text-muted-600'>{t('rolePermissions.viewer.description')}</p>
              </div>
              <div className='border border-dark-600 rounded-xl p-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Users size={16} className='text-brand-600' />
                  <h3 className='font-medium text-alpine-900'>
                    {t('rolePermissions.operator.label')}
                  </h3>
                </div>
                <p className='text-xs text-muted-600'>
                  {t('rolePermissions.operator.description')}
                </p>
              </div>
              <div className='border border-dark-600 rounded-xl p-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Shield size={16} className='text-loss-600' />
                  <h3 className='font-medium text-alpine-900'>
                    {t('rolePermissions.admin.label')}
                  </h3>
                </div>
                <p className='text-xs text-muted-600'>{t('rolePermissions.admin.description')}</p>
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='border-b border-dark-600'>
                    <th className='text-left py-2 px-3 text-xs font-medium text-muted-600 uppercase'>
                      {t('rolePermissions.table.resource')}
                    </th>
                    <th className='text-center py-2 px-3 text-xs font-medium text-muted-600 uppercase'>
                      {t('rolePermissions.table.viewer')}
                    </th>
                    <th className='text-center py-2 px-3 text-xs font-medium text-muted-600 uppercase'>
                      {t('rolePermissions.table.operator')}
                    </th>
                    <th className='text-center py-2 px-3 text-xs font-medium text-muted-600 uppercase'>
                      {t('rolePermissions.table.admin')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rolePermissions.map(row => (
                    <tr key={row.resource} className='border-b border-dark-600'>
                      <td className='py-2 px-3 text-alpine-900'>{row.resource}</td>
                      <td className='py-2 px-3 text-center'>
                        <AccessMark granted={row.viewer} />
                      </td>
                      <td className='py-2 px-3 text-center'>
                        <AccessMark granted={row.operator} />
                      </td>
                      <td className='py-2 px-3 text-center'>
                        <AccessMark granted={row.admin} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <UserManagement readOnly={readOnly} />
      <ScopeGrantManagement readOnly={readOnly} />
      <CredentialManagement readOnly={readOnly} />
    </div>
  )
}
