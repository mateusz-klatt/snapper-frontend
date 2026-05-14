import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2 } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth'
import ScopeGrantList from './ScopeGrantList'
import ScopeGrantForm from './ScopeGrantForm'
import HandoverDialog from './HandoverDialog'
import type { ScopeGrantInfo } from '../../../types/api'

interface ScopeGrantManagementProps {
  readOnly?: boolean
}

const ScopeGrantManagement: React.FC<Readonly<ScopeGrantManagementProps>> = ({ readOnly }) => {
  const { t } = useTranslation('admin')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [handoverGrant, setHandoverGrant] = useState<ScopeGrantInfo | null>(null)
  const { hasPermission } = useAuthStore()

  if (!hasPermission('manage:scope_grants')) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[40vh] text-center'>
        <Link2 className='w-16 h-16 text-muted-400 mb-4' />
        <h2 className='text-xl font-semibold text-alpine-900 mb-2'>
          {t('scopeGrants.accessDenied.title')}
        </h2>
        <p className='text-muted-600 max-w-md'>{t('scopeGrants.accessDenied.message')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <ScopeGrantList
        onCreateGrant={() => setShowCreateForm(true)}
        onHandover={setHandoverGrant}
        readOnly={readOnly}
      />
      <ScopeGrantForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        readOnly={readOnly}
      />
      <HandoverDialog
        grant={handoverGrant}
        open={handoverGrant !== null}
        onClose={() => setHandoverGrant(null)}
        readOnly={readOnly}
      />
    </div>
  )
}

export default ScopeGrantManagement
