
import React from 'react';
import { DetailedBanknote } from '@/types';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface BanknoteCatalogDetailMinimizedProps {
  banknote: DetailedBanknote;
  onImageClick?: (url: string) => void;
}

export function BanknoteCatalogDetailMinimized({ banknote, onImageClick }: BanknoteCatalogDetailMinimizedProps) {
  const { t } = useTranslation(['catalog']);
  const { direction } = useLanguage();

  return (
    <div className="space-y-2">
      {banknote?.extendedPickNumber && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.extendedPickNumber')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.extendedPickNumber}</span>
        </div>
      )}
      {banknote?.pickNumber && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.pickNumber')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.pickNumber} </span>
        </div>
      )}
      {banknote?.turkCatalogNumber && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.turkCatalogNumber')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.turkCatalogNumber}</span>
        </div>
      )}
      {banknote?.denomination && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.faceValue')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.denomination}</span>
        </div>
      )}
      {banknote?.country && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.country')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.country}</span>
        </div>
      )}
      {banknote?.islamicYear && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.islamicYear')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.islamicYear}</span>
        </div>
      )}
      {banknote?.gregorianYear && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.gregorianYear')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.gregorianYear}</span>
        </div>
      )}
      {banknote?.sultanName && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
           <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.authorityName || t('details.sultanName')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.sultanName}</span>
        </div>
      )}
      {banknote?.printer && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.printer')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.printer}</span>
        </div>
      )}
      {banknote?.type && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.type')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.type}</span>
        </div>
      )}
      {banknote?.category && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.category')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.category}</span>
        </div>
      )}
      {banknote?.rarity && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.rarity')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.rarity}</span>
        </div>
      )}
      {banknote?.securityElement && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.securityElement')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.securityElement}</span>
        </div>
      )}
      {banknote?.colors && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.colors')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.colors}</span>
        </div>
      )}
      {banknote?.serialNumbering && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.serialNumbering')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.serialNumbering}</span>
        </div>
      )}
      {banknote?.description && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.banknoteDescription')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.description}</span>
        </div>
      )}
      {banknote?.historicalDescription && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.historicalDescription')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.historicalDescription}</span>
        </div>
      )}
      {banknote?.dimensions && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.dimensions')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.dimensions}</span>
        </div>
      )}
      {banknote?.signaturesFront && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.frontSignatures')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.signaturesFront}</span>
        </div>
      )}
      {banknote?.signaturesBack && (
        <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.backSignatures')}</span>
          <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.signaturesBack}</span>
        </div>
      )}
      {banknote?.sealNames &&
  (!banknote.sealPictureUrls || banknote.sealPictureUrls.length === 0) && (
    <div className={`flex items-center gap-x-2 border-b border-gray-100 py-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <span className={`text-sm font-medium text-muted-foreground w-32 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.sealNames')}</span>
      <span className={`text-base ${direction === 'rtl' ? 'text-right' : ''}`}>{banknote.sealNames}</span>
    </div>
)}

      {/* Display resolved signature picture URLs from enhanced view */}
      {banknote?.signaturesFrontUrls && banknote.signaturesFrontUrls.length > 0 && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.frontSignaturePictures')}</span>
          <div className="flex flex-wrap gap-2">
            {banknote.signaturesFrontUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Signature ${index + 1}`}
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => onImageClick?.(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Display resolved signature picture URLs from enhanced view */}
      {banknote?.signaturesBackUrls && banknote.signaturesBackUrls.length > 0 && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.backSignaturePictures')}</span>
          <div className="flex flex-wrap gap-2">
            {banknote.signaturesBackUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Signature ${index + 1}`}
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => onImageClick?.(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Display resolved seal picture URLs from enhanced view */}
      {banknote?.sealPictureUrls && banknote.sealPictureUrls.length > 0 && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.sealPictures')}</span>
          <div className="flex flex-wrap gap-2">
            {banknote.sealPictureUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Seal ${index + 1}`}
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => onImageClick?.(url)}
              />
            ))}
          </div>
        </div>
      )}

     

      {/* Display resolved watermark picture URL from enhanced view */}
      {banknote?.watermarkUrl && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.watermarkPicture')}</span>
          <img
            src={banknote.watermarkUrl}
            alt="Watermark"
            className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => onImageClick?.(banknote.watermarkUrl!)}
          />
        </div>
      )}

      {/* Display resolved tughra picture URL from enhanced view */}
      {banknote?.tughraUrl && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.tughraPicture')}</span>
          <img
            src={banknote.tughraUrl}
            alt="Tughra"
            className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => onImageClick?.(banknote.tughraUrl!)}
          />
        </div>
      )}


       {/* Display resolved other element picture URLs from enhanced view */}
       {banknote?.otherElementPictures && banknote.otherElementPictures.length > 0 && (
        <div className={`flex items-start gap-x-2 border-b border-gray-100 py-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-muted-foreground w-32 mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>{t('details.otherPictures')}</span>
          <div className="flex flex-wrap gap-2">
            {banknote.otherElementPictures.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Other Element ${index + 1}`}
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => onImageClick?.(url)}
              />
            ))}
          </div>
        </div>
      )}


    </div>
  );
}