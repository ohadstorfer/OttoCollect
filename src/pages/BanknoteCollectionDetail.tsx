import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionItem } from '@/services/collectionService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabelValuePair } from "@/components/ui/label-value-pair";
import { useBanknoteContext } from '@/context/BanknoteContext';
import { CollectionItem } from '@/types';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Dialog, DialogContentWithScroll } from '@/components/ui/dialog';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { useToast } from '@/hooks/use-toast';
import { BanknoteImage } from '@/components/banknote/BanknoteImage';
import ImagePreview from "@/components/shared/ImagePreview";
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { CollectionItemTranslationButton } from '@/components/collection/CollectionItemTranslationButton';

interface BanknoteCollectionDetailProps {
  isOwner: boolean;
}

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ isOwner }) => {
  const { t } = useTranslation(['collection']);
  const { id } = useParams<{ id: string }>();
  const { banknoteId } = useBanknoteContext();
  const { toast } = useToast();
  const { direction, currentLanguage } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Translation state for public note
  const [translatedPublicNote, setTranslatedPublicNote] = useState('');
  const [showTranslatedPublicNote, setShowTranslatedPublicNote] = useState(false);

  // Helper function to get localized authority name
  const getLocalizedAuthorityName = (banknote: any): string => {


    if (currentLanguage === 'ar' && banknote.authorityName_ar) {
      return banknote.authorityName_ar;
    } else if (currentLanguage === 'tr' && banknote.authorityName_tr) {
      return banknote.authorityName_tr;
    }
    
    return banknote.authorityName || t('details.authority');
  };

  // Helper function to get localized banknote field (similar to BanknoteDetailCard)
  const getLocalizedField = (field: string, fieldType: any): string => {
    

    if (currentLanguage === 'en' || !field) {
      return field || '';
    }

    const banknoteAny = collectionItem?.banknote as any;
    let languageSpecificField: string | string[] | undefined;
    
    if (currentLanguage === 'ar') {
      languageSpecificField = banknoteAny?.[`${fieldType}_ar`];
    } else if (currentLanguage === 'tr') {
      languageSpecificField = banknoteAny?.[`${fieldType}_tr`];
    }

    

    if (Array.isArray(languageSpecificField)) {
      const result = languageSpecificField.join(' | ');
      return result;
    }

    const finalTranslatedField = languageSpecificField || field;
    return finalTranslatedField;
  };

  // Determine which ID to use
  const itemId = id || banknoteId;

  // Fetch collection item data
  const { data: collectionItem, isLoading, refetch } = useQuery({
    queryKey: ["collectionItem", itemId, "with-translations"],
    queryFn: () => fetchCollectionItem(itemId || ""),
    enabled: !!itemId,
  });

  // Add detailed logging when collection item is loaded
  React.useEffect(() => {
    if (collectionItem) {
      console.log("BanknoteCollectionDetail - Collection item loaded:", collectionItem);
      console.log("BanknoteCollectionDetail - Banknote data:", collectionItem.banknote);
      console.log("BanknoteCollectionDetail - Resolved stamp URLs:", {
        signaturePictureUrls: collectionItem.banknote?.signaturePictureUrls,
        sealPictureUrls: collectionItem.banknote?.sealPictureUrls,
        watermarkUrl: collectionItem.banknote?.watermarkUrl,
        tughraUrl: collectionItem.banknote?.tughraUrl
      });
      console.log("banknote: ", collectionItem.banknote);
      
    }
  }, [collectionItem, currentLanguage]);

  if (isLoading || !collectionItem) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-center">{t('details.loadingCollectionDetails')}</p>
      </div>
    );
  }

  const isUnlisted = collectionItem.is_unlisted_banknote;

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  return (
    <div className="p-6">
      {/* Banknote Details Section */}
      <div className="space-y-6">
        <div className={direction === 'rtl' ? 'text-right' : 'text-left'}>
          <h3 className={`text-lg font-medium mb-4 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}> <span> {t('details.publicDetails')} </span> </h3>
          <div className="space-y-2">
            {collectionItem.banknote?.extendedPickNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.extendedPickNumber')}</span>
                <span className="text-base">{collectionItem.banknote.extendedPickNumber}</span>
              </div>
            )}
            {collectionItem.banknote?.pickNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.pickNumber')}</span>
                <span className="text-base">{collectionItem.banknote.pickNumber} </span>
              </div>
            )}
            {collectionItem.banknote?.turkCatalogNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.turkCatalogNumber')}</span>
                <span className="text-base">{collectionItem.banknote.turkCatalogNumber}</span>
              </div>
            )}
            {collectionItem.banknote?.denomination && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.denomination')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.denomination, 'denomination')}</span>
              </div>
            )}
            {collectionItem.banknote?.country && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.country')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.country, 'country')}</span>
              </div>
            )}
            {collectionItem.banknote?.category && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.category')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.category, 'category')}</span>
              </div>
            )}
            {collectionItem.banknote?.sultanName && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">
                  {getLocalizedAuthorityName(collectionItem.banknote)}
                </span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.sultanName, 'sultan_name')}</span>
              </div>
            )}
            {!collectionItem.type && collectionItem.banknote?.type && ( 
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.type')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.type, 'type')}</span>
              </div>
            )}
            {collectionItem.banknote?.serialNumbering && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.prefixRange')}</span>
                <span className="text-base">{collectionItem.banknote.serialNumbering}</span>
              </div>
            )}

            {isUnlisted && collectionItem.banknote?.description && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.description')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.description, 'banknote_description')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-full h-px bg-muted my-6" />

        {/* Collection Item Details */}
        <div className={direction === 'rtl' ? 'text-right' : 'text-left'}>
          <div className="space-y-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}">
            {collectionItem.condition && !collectionItem.grade && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.condition')}</span>
                <span className="text-base">{collectionItem.condition}</span>
              </div>
            )}
            {collectionItem.grade && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.grading')}</span>
                <span className="text-base">
                  {collectionItem.grade_by && `${collectionItem.grade_by} `}{collectionItem.grade}{collectionItem.grade_condition_description && ` - ${collectionItem.grade_condition_description}`}
                </span>
              </div>
            )}
            {collectionItem.publicNote && (
              <div className="flex items-start gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32 flex-shrink-0">{t('details.notes')}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-base block">
                    {showTranslatedPublicNote && translatedPublicNote ? translatedPublicNote : collectionItem.publicNote}
                  </span>
                  <div className="mt-1">
                    {console.log('🔍 [BanknoteCollectionDetail] Translation button data:', {
                      collectionItemId: collectionItem.id,
                      publicNote: collectionItem.publicNote,
                      originalLanguage: (collectionItem as any).public_note_original_language,
                      allTranslationFields: Object.keys(collectionItem).filter(key => key.includes('public_note'))
                    })}
                    <CollectionItemTranslationButton
                      itemId={collectionItem.id}
                      currentPublicNote={showTranslatedPublicNote && translatedPublicNote ? translatedPublicNote : collectionItem.publicNote}
                      originalPublicNote={collectionItem.publicNote}
                      originalLanguage={(collectionItem as any).public_note_original_language}
                      isShowingTranslation={showTranslatedPublicNote}
                      onTranslated={(publicNote) => {
                        if (publicNote === collectionItem.publicNote) {
                          // Show original
                          setShowTranslatedPublicNote(false);
                        } else {
                          // Show translation
                          setTranslatedPublicNote(publicNote);
                          setShowTranslatedPublicNote(true);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            {collectionItem.isForSale && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.forSale')}</span>
                <span className="text-base">${collectionItem.salePrice}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-full h-px bg-muted my-6" />

        <div className={`space-y-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
          {collectionItem.type && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.type')}</span>
              <span className="text-base">{collectionItem.type}</span>
            </div>
          )}
          {collectionItem.prefix && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.prefix')}</span>
              <span className="text-base">{collectionItem.prefix}</span>
            </div>
          )}
          {collectionItem.banknote?.islamicYear && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.islamicYear')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.islamicYear, 'islamic_year')}</span>
            </div>
          )}
          {collectionItem.banknote?.gregorianYear && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.gregorianYear')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.gregorianYear, 'gregorian_year')}</span>
            </div>
          )}
                      {collectionItem.banknote?.description && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.banknoteDescription')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.description, 'banknote_description')}</span>
              </div>
            )}
          {collectionItem.banknote?.historicalDescription && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.historicalDescription')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.historicalDescription, 'historical_description')}</span>
            </div>
          )}
          {collectionItem.banknote?.securityElement && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.securityElement')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.securityElement, 'security_element')}</span>
            </div>
          )}
          {collectionItem.banknote?.colors && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.colors')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.colors, 'colors')}</span>
            </div>
          )}
          {collectionItem.banknote?.dimensions && (
        <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
          <span className="text-sm font-medium text-muted-foreground w-32">{t('details.dimensions')}</span>
          <span className="text-base">{getLocalizedField(collectionItem.banknote.dimensions, 'dimensions')}</span>
        </div>
      )}
          {collectionItem.banknote?.printer && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.printer')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.printer, 'printer')}</span>
            </div>
          )}
          {collectionItem.banknote?.rarity && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.rarity')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.rarity, 'rarity')}</span>
            </div>
          )}
          {collectionItem.banknote?.sealNames &&
            (!collectionItem.banknote.sealPictureUrls ||
              collectionItem.banknote.sealPictureUrls.length === 0) && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">{t('details.sealNames')}</span>
                <span className="text-base">{getLocalizedField(collectionItem.banknote.sealNames, 'seal_names')}</span>
              </div>
            )}
          {collectionItem.banknote?.signaturesFront && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.frontSignatures')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.signaturesFront, 'signatures_front')}</span>
            </div>
          )}

          {collectionItem.banknote?.signaturesBack && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">{t('details.backSignatures')}</span>
              <span className="text-base">{getLocalizedField(collectionItem.banknote.signaturesBack, 'signatures_back')}</span>
            </div>
          )}

         {/* Display resolved signature picture URLs from enhanced view */}
      {collectionItem.banknote?.signaturesFrontUrls && collectionItem.banknote.signaturesFrontUrls.length > 0 && (
        <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
          <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.frontSignaturePictures')}</span>
          <div className="flex flex-wrap gap-2">
                         {collectionItem.banknote.signaturesFrontUrls.map((url, index) => (
               <img
                 key={index}
                 src={url}
                 alt={t('details.signatureImage', { number: index + 1 })}
                 className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 "
                //  onClick={() => openImageViewer(url)}
                 onError={(e) => (e.currentTarget.style.display = "none")}
               />
             ))}
          </div>
        </div>
      )}

      {/* Display resolved signature picture URLs from enhanced view */}
      {collectionItem.banknote?.signaturesBackUrls && collectionItem.banknote.signaturesBackUrls.length > 0 && (
        <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
          <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.backSignaturePictures')}</span>
          <div className="flex flex-wrap gap-2">
                         {collectionItem.banknote.signaturesBackUrls.map((url, index) => (
               <img
                 key={index}
                 src={url}
                 alt={t('details.signatureImage', { number: index + 1 })}
                 className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 "
                //  onClick={() => openImageViewer(url)}
                 onError={(e) => (e.currentTarget.style.display = "none")}
               />
             ))}
          </div>
        </div>
      )}

          {/* Display resolved seal picture URLs from enhanced view */}
          {collectionItem.banknote?.sealPictureUrls && collectionItem.banknote.sealPictureUrls.length > 0 && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.sealPictures')}</span>
              <div className="flex flex-wrap gap-2">
                {collectionItem.banknote.sealPictureUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={t('details.sealImage', { number: index + 1 })}
                    className="rounded-lg max-h-40 object-contain border border-gray-200 dark:border-gray-700 "
                    // onClick={() => openImageViewer(url)}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Display resolved watermark picture URL from enhanced view */}
          {collectionItem.banknote?.watermarkUrl && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.watermarkPicture')}</span>
              <img
                src={collectionItem.banknote.watermarkUrl}
                alt={t('details.watermarkImage')}
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 "
                // onClick={() => openImageViewer(collectionItem.banknote.watermarkUrl!)}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          {/* Display resolved tughra picture URL from enhanced view */}
          {collectionItem.banknote?.tughraUrl && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.tughraPicture')}</span>
              <img
                src={collectionItem.banknote.tughraUrl}
                alt={t('details.tughraImage')}
                className="rounded-lg max-h-40 object-contain border border-gray-200 dark:border-gray-700 "
                // onClick={() => openImageViewer(collectionItem.banknote.tughraUrl!)}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          {/* Display resolved other element picture URLs from enhanced view */}
          {collectionItem.banknote?.otherElementPictures && collectionItem.banknote.otherElementPictures.length > 0 && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">{t('details.otherPictures')}</span>
              <div className="flex flex-wrap gap-2">
                {collectionItem.banknote.otherElementPictures.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={t('details.otherElementImage', { number: index + 1 })}
                    className="rounded-lg max-h-40 object-contain border border-gray-200 dark:border-gray-700 "
                    // onClick={() => openImageViewer(url)}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Private Details Section - Only visible to owner */}
        <div className="w-full h-px bg-muted my-6" />
        {isOwner && (
          <div className={direction === 'rtl' ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-medium"> <span> {t('details.privateDetails')} </span> </h3>
              <span className="text-sm text-muted-foreground">{t('details.onlyVisibleToYou')}</span>
            </div>
            <div className="space-y-2">
              {collectionItem.privateNote && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">{t('details.privateNotes')}</span>
                  <span className="text-base">{collectionItem.privateNote}</span>
                </div>
              )}
              {collectionItem.location && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">{t('details.itemStatus')}</span>
                  <span className="text-base">{collectionItem.location}</span>
                </div>
              )}
             
              {collectionItem.purchaseDate && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">{t('details.purchaseDate')}</span>
                  <span className="text-base">{formatDate(collectionItem.purchaseDate)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ImagePreview 
        src={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

    </div>
  );
};

export default BanknoteCollectionDetail;