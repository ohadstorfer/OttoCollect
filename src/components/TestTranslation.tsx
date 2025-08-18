import React from 'react';
import { useTranslation } from 'react-i18next';

const TestTranslation: React.FC = () => {
  const { t, i18n } = useTranslation(['collection']);

  console.log('Current language:', i18n.language);
  console.log('Available languages:', i18n.languages);
  console.log('Loaded namespaces:', i18n.reportNamespaces.getUsedNamespaces());
  console.log('Translation test:', t('addUnlistedBanknote'));

  return (
    <div>
      <h2>Translation Test</h2>
      <p>Current language: {i18n.language}</p>
      <p>Test translation: {t('addUnlistedBanknote')}</p>
      <p>Fallback test: {t('addUnlistedBanknote', 'Add Unlisted Banknote')}</p>
    </div>
  );
};

export default TestTranslation; 