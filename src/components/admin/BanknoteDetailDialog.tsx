
import React from 'react';
import { useTranslation } from 'react-i18next';
import BanknoteCatalogDetail from '@/pages/BanknoteCatalogDetail';
import { useParams } from 'react-router-dom';

interface BanknoteDetailDialogProps {
  id?: string;
}

// This component wraps BanknoteCatalogDetail to make it work properly in a dialog context
const BanknoteDetailDialog: React.FC<BanknoteDetailDialogProps> = ({ id }) => {
  const { t } = useTranslation(['admin']);
  // When id is provided directly, use it. Otherwise, try to get it from URL params (normal page context)
  const params = useParams<{ id: string }>();
  const banknoteId = id || params.id;

  if (!banknoteId) {
    return <div className="p-4 text-center">{t('banknoteDetailDialog.noIdProvided')}</div>;
  }

  return <BanknoteCatalogDetail id={banknoteId} />;
};

export default BanknoteDetailDialog;
