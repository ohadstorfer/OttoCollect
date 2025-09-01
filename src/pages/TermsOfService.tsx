import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

const TermsOfService = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['pages']);
  const { direction } = useLanguage();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('terms.back')}
          </Button>
        </div>

        {/* Terms of Service Content */}
        <div className={`bg-card border rounded-lg p-6 ${direction === 'rtl' ? 'text-right' : ''}`}>
          <div className="prose prose-sm max-w-none">
            <h1 className="text-2xl font-bold mb-6">
              <span>{t('terms.title')}</span>
            </h1>

            {/* Translation Note - Show only for non-English languages */}
            {t('terms.translationNote') && (
              <div className=" mb-6">
                <div className="flex">
              
                  <div >
                    <p className="text-sm text-yellow-700">
                      {t('terms.translationNote')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.acceptance.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.acceptance.pointA.label')}</strong> {t('terms.sections.acceptance.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.acceptance.pointB.label')}</strong> {t('terms.sections.acceptance.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.acceptance.pointC.label')}</strong> {t('terms.sections.acceptance.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.acceptance.pointD.label')}</strong> {t('terms.sections.acceptance.pointD.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.website.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.website.pointA.label')}</strong> {t('terms.sections.website.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.website.pointB.label')}</strong> {t('terms.sections.website.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.website.pointC.label')}</strong> {t('terms.sections.website.pointC.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.accounts.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.accounts.pointA.label')}</strong> {t('terms.sections.accounts.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.accounts.pointB.label')}</strong> {t('terms.sections.accounts.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.accounts.pointC.label')}</strong> {t('terms.sections.accounts.pointC.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.generalUse.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.generalUse.intro')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointA.label')}</strong> {t('terms.sections.generalUse.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointB.label')}</strong> {t('terms.sections.generalUse.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointC.label')}</strong> {t('terms.sections.generalUse.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointD.label')}</strong> {t('terms.sections.generalUse.pointD.content')}
            </p>
            <ul className="list-disc pl-6 mb-3">
              <li>{t('terms.sections.generalUse.prohibitedUses.sale')}</li>
              <li>{t('terms.sections.generalUse.prohibitedUses.advertising')}</li>
              <li>{t('terms.sections.generalUse.prohibitedUses.competing')}</li>
            </ul>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointE.label')}</strong> {t('terms.sections.generalUse.pointE.content')}
            </p>
            <ul className="list-disc pl-6 mb-3">
              <li>{t('terms.sections.generalUse.permittedUses.swapList')}</li>
              <li>{t('terms.sections.generalUse.permittedUses.authorizedUse')}</li>
            </ul>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointF.label')}</strong> {t('terms.sections.generalUse.pointF.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointG.label')}</strong> {t('terms.sections.generalUse.pointG.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.generalUse.pointH.label')}</strong> {t('terms.sections.generalUse.pointH.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.yourUseOfContent.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointA.label')}</strong> {t('terms.sections.yourUseOfContent.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointB.label')}</strong> {t('terms.sections.yourUseOfContent.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointC.label')}</strong> {t('terms.sections.yourUseOfContent.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointD.label')}</strong> {t('terms.sections.yourUseOfContent.pointD.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointE.label')}</strong> {t('terms.sections.yourUseOfContent.pointE.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointF.label')}</strong> {t('terms.sections.yourUseOfContent.pointF.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointG.label')}</strong> {t('terms.sections.yourUseOfContent.pointG.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUseOfContent.pointH.label')}</strong> {t('terms.sections.yourUseOfContent.pointH.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.yourUserContributions.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointA.label')}</strong> {t('terms.sections.yourUserContributions.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointB.label')}</strong> {t('terms.sections.yourUserContributions.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointC.label')}</strong> {t('terms.sections.yourUserContributions.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointD.label')}</strong> {t('terms.sections.yourUserContributions.pointD.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointE.label')}</strong> {t('terms.sections.yourUserContributions.pointE.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointF.label')}</strong> {t('terms.sections.yourUserContributions.pointF.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointG.label')}</strong> {t('terms.sections.yourUserContributions.pointG.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.yourUserContributions.pointH.label')}</strong> {t('terms.sections.yourUserContributions.pointH.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.accountTerminationPolicy.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.accountTerminationPolicy.pointA.label')}</strong> {t('terms.sections.accountTerminationPolicy.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.accountTerminationPolicy.pointB.label')}</strong> {t('terms.sections.accountTerminationPolicy.pointB.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.subscriptions.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.subscriptions.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.marketplace.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.marketplace.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.api.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.api.intro')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointA.label')}</strong> {t('terms.sections.api.pointA.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointB.label')}</strong> {t('terms.sections.api.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointC.label')}</strong> {t('terms.sections.api.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointD.label')}</strong> {t('terms.sections.api.pointD.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointE.label')}</strong> {t('terms.sections.api.pointE.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointF.label')}</strong> {t('terms.sections.api.pointF.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointG.label')}</strong> {t('terms.sections.api.pointG.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.api.pointH.label')}</strong> {t('terms.sections.api.pointH.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.warrantyDisclaimer.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.warrantyDisclaimer.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.limitationOfLiability.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.limitationOfLiability.content')}
            </p>
            <p className="mb-3">
              {t('terms.sections.limitationOfLiability.acknowledgement')}
            </p>
            <p className="mb-3">
              {t('terms.sections.limitationOfLiability.location')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.indemnity.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.indemnity.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.csae.title')}</span>
            </h2>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointA.label')}</strong> {t('terms.sections.csae.pointA.content')}
            </p>
            <ul className="list-disc pl-6 mb-3">
              <li>{t('terms.sections.csae.pointA.list.item1')}</li>
              <li>{t('terms.sections.csae.pointA.list.item2')}</li>
              <li>{t('terms.sections.csae.pointA.list.item3')}</li>
            </ul>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointB.label')}</strong> {t('terms.sections.csae.pointB.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointC.label')}</strong> {t('terms.sections.csae.pointC.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointD.label')}</strong> {t('terms.sections.csae.pointD.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointE.label')}</strong> {t('terms.sections.csae.pointE.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointF.label')}</strong> {t('terms.sections.csae.pointF.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointG.label')}</strong> {t('terms.sections.csae.pointG.content')}
            </p>
            <p className="mb-3">
              <strong>{t('terms.sections.csae.pointH.label')}</strong> {t('terms.sections.csae.pointH.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.acceptanceOfTerms.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.acceptanceOfTerms.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.assignment.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.assignment.content')}
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">
              <span>{t('terms.sections.general.title')}</span>
            </h2>
            <p className="mb-3">
              {t('terms.sections.general.content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 