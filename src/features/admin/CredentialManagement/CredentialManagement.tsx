import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth'
import CredentialList from './CredentialList'
import CredentialForm from './CredentialForm'
import RotateDialog from './RotateDialog'
import type { CredentialSummary } from '../../../types/api'

interface CredentialManagementProps {
  readOnly?: boolean
}

const CredentialManagement: React.FC<Readonly<CredentialManagementProps>> = ({ readOnly }) => {
  const { t } = useTranslation('admin')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [rotateCredential, setRotateCredential] = useState<CredentialSummary | null>(null)
  const { hasPermission } = useAuthStore()

  if (!hasPermission('manage:wallet_credentials')) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[40vh] text-center'>
        <KeyRound className='w-16 h-16 text-muted-400 mb-4' />
        <h2 className='text-xl font-semibold text-alpine-900 mb-2'>
          {t('credentials.accessDenied.title')}
        </h2>
        <p className='text-muted-600 max-w-md'>{t('credentials.accessDenied.message')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <CredentialList
        onCreateCredential={() => setShowCreateForm(true)}
        onRotate={setRotateCredential}
        readOnly={readOnly}
      />
      <CredentialForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        readOnly={readOnly}
      />
      <RotateDialog
        credential={rotateCredential}
        open={rotateCredential !== null}
        onClose={() => setRotateCredential(null)}
        readOnly={readOnly}
      />
    </div>
  )
}

export default CredentialManagement
