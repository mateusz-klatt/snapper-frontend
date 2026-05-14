import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import i18n from '../i18n/config'
import type { CatalogLanguage } from '../i18n/types'

export const renderWithI18n = (
  ui: ReactElement,
  language: CatalogLanguage = 'en',
  options?: Omit<RenderOptions, 'queries'>
): RenderResult => {
  void i18n.changeLanguage(language)

  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>, options)
}
