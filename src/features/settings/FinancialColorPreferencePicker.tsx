import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app'
import {
  FINANCIAL_COLOR_PREFERENCES,
  resolveFinancialColorConvention,
  type FinancialColorPreference,
} from '../../theme/financialColorPreference'

/**
 * Settings widget that lets the user pick their financial color
 * convention (red = up vs green = up) explicitly, or stay on the
 * locale-derived auto default.
 *
 * Lives in `features/settings/` because the existing Settings page is
 * the one place users go to tune display preferences. Standalone
 * component so the same picker can be embedded elsewhere later
 * (e.g. a first-run onboarding modal) without reshaping Settings.tsx.
 */
export const FinancialColorPreferencePicker = () => {
  const { t } = useTranslation('settings')
  const preference = useAppStore(s => s.financialColorPreference)
  const locale = useAppStore(s => s.locale)
  const setPreference = useAppStore(s => s.setFinancialColorPreference)
  const effective = resolveFinancialColorConvention(preference, locale)
  const subtitleKey =
    effective === 'rising-red'
      ? 'financialColor.subtitleRisingRed'
      : 'financialColor.subtitleRisingGreen'
  const autoCurrent = t(subtitleKey, {
    defaultValue: effective === 'rising-red' ? 'red up / green down' : 'green up / red down',
  })

  return (
    <fieldset className='rounded-xl border border-dark-600 bg-alpine-50 p-4'>
      <legend className='px-2 text-sm font-medium text-alpine-900'>
        {t('financialColor.title', { defaultValue: 'Financial color convention' })}
      </legend>
      <div
        className='mt-2 flex flex-col gap-2'
        role='radiogroup'
        aria-label={t('financialColor.title', { defaultValue: 'Financial color convention' })}
      >
        {FINANCIAL_COLOR_PREFERENCES.map((option: FinancialColorPreference) => {
          const checked = preference === option
          const label = renderOptionLabel(option, t)

          return (
            <label
              key={option}
              className='flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-dark-600'
            >
              <input
                type='radio'
                name='financialColorPreference'
                value={option}
                checked={checked}
                onChange={() => setPreference(option)}
                className='mt-1'
              />
              <span className='flex flex-col gap-0.5'>
                <span className='text-sm font-medium text-alpine-900'>{label}</span>
                {option === 'auto' && (
                  <span className='text-xs text-muted-600'>
                    {t('financialColor.subtitleAutoCurrent', {
                      convention: autoCurrent,
                      defaultValue: `Currently: ${autoCurrent}`,
                    })}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function renderOptionLabel(
  option: FinancialColorPreference,
  t: ReturnType<typeof useTranslation<'settings'>>['t']
): string {
  switch (option) {
    case 'auto':
      return t('financialColor.auto', { defaultValue: 'Match my locale (auto)' })
    case 'rising-green':
      return t('financialColor.risingGreen', {
        defaultValue: 'Green = up, red = down (Western)',
      })
    case 'rising-red':
      return t('financialColor.risingRed', {
        defaultValue: 'Red = up, green = down (East Asian convention)',
      })
  }
}
