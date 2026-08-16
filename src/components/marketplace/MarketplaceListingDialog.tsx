import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  getMarketplaceItemForCollectionItem,
  removeFromMarketplace,
  saveMarketplaceListing,
  ListingInput,
} from '@/services/marketplaceService';
import {
  fetchApprovedDomains,
  isUrlApproved,
  normalizeDomain,
  createPendingDomainRequest,
  ApprovedDomain,
} from '@/services/approvedDomainsService';
import {
  combineAuctionDateTime,
  splitAuctionDateTime,
  normalizeListingUrl,
  CURRENCIES,
  CURRENCY_SYMBOL,
  UTC_OFFSETS,
} from '@/lib/marketplaceListing';
import { ListingCurrency, ListingType, MarketplaceItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionItemId: string;
  onSaved?: () => void;
}

const NUMERIC = /^[0-9]*\.?[0-9]*$/;

// The auction date is stored as a "YYYY-MM-DD" string; the Calendar works with
// Date objects. Convert using local date parts (never Date's UTC parsing) so the
// day the user picks is the day that gets stored, regardless of timezone.
const parseDateString = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};
const formatDateString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export function MarketplaceListingDialog({
  open, onOpenChange, collectionItemId, onSaved,
}: MarketplaceListingDialogProps) {
  const { t } = useTranslation(['marketplace']);
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<MarketplaceItem | null>(null);
  const [approvedDomains, setApprovedDomains] = useState<ApprovedDomain[]>([]);
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [snapshot, setSnapshot] = useState('');

  const [listingType, setListingType] = useState<ListingType>('sale');
  const [currency, setCurrency] = useState<ListingCurrency>('USD');
  const [salePrice, setSalePrice] = useState('');
  const [publicRemark, setPublicRemark] = useState('');
  const [url, setUrl] = useState('');
  const [isSold, setIsSold] = useState(false);
  const [chatConsent, setChatConsent] = useState(false);
  const [initialConsent, setInitialConsent] = useState(false);
  const [auctionDate, setAuctionDate] = useState('');
  const [auctionTime, setAuctionTime] = useState('');
  const [auctionTz, setAuctionTz] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');

  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFieldErrors({});
    setApprovalRequested(false);
    setShowCancelConfirm(false);
    Promise.all([
      getMarketplaceItemForCollectionItem(collectionItemId),
      fetchApprovedDomains(),
      user?.id
        ? supabase.from('profiles').select('chat_email_consent').eq('id', user.id).single()
        : Promise.resolve({ data: null }),
    ]).then(([item, domains, profileRes]) => {
      if (cancelled) return;
      setApprovedDomains(domains);
      setExisting(item);
      const consent = Boolean((profileRes as any)?.data?.chat_email_consent);
      setChatConsent(consent);
      setInitialConsent(consent);
      let vals: Array<string | boolean>;
      if (item) {
        const cur = (item.currency ?? 'USD') as ListingCurrency;
        let date = '';
        let time = '';
        if (item.auction_at) {
          ({ date, time } = splitAuctionDateTime(item.auction_at, item.auction_timezone ?? null));
        }
        setListingType((item.listing_type ?? 'sale') as ListingType);
        setCurrency(cur);
        setSalePrice(item.collectionItem?.salePrice ? String(item.collectionItem.salePrice) : '');
        setPublicRemark(item.public_remark ?? '');
        setUrl(item.external_listing_url ?? '');
        setIsSold(Boolean(item.is_sold));
        setLotNumber(item.lot_number ?? '');
        setStartPrice(item.start_price != null ? String(item.start_price) : '');
        setEstimatedPrice(item.estimated_price ?? '');
        setAuctionTz(item.auction_timezone ?? '');
        setAuctionDate(date);
        setAuctionTime(time);
        vals = [
          (item.listing_type ?? 'sale'), cur,
          item.collectionItem?.salePrice ? String(item.collectionItem.salePrice) : '',
          item.public_remark ?? '', item.external_listing_url ?? '', Boolean(item.is_sold),
          date, time, item.auction_timezone ?? '', item.lot_number ?? '',
          item.start_price != null ? String(item.start_price) : '',
          item.estimated_price ?? '',
          consent,
        ];
      } else {
        setListingType('sale');
        setCurrency('USD');
        setSalePrice(''); setPublicRemark(''); setUrl(''); setIsSold(false);
        setAuctionDate(''); setAuctionTime(''); setAuctionTz('');
        setLotNumber(''); setStartPrice(''); setEstimatedPrice('');
        vals = ['sale', 'USD', '', '', '', false, '', '', '', '', '', '', consent];
      }
      setSnapshot(JSON.stringify(vals));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, collectionItemId, user?.id]);

  // Same field order as the snapshot above — dirty means "would lose changes".
  const currentSerialized = JSON.stringify([
    listingType, currency, salePrice, publicRemark, url, isSold,
    auctionDate, auctionTime, auctionTz, lotNumber, startPrice, estimatedPrice,
    chatConsent,
  ]);
  const isDirty = snapshot !== '' && currentSerialized !== snapshot;

  // Spec §4: closing with unsaved changes must warn ("Changes will not be saved").
  const requestClose = () => {
    if (isDirty) setShowCancelConfirm(true);
    else onOpenChange(false);
  };

  const urlTrimmed = url.trim();
  // Users type bare domains ("greenappleauction.com"); normalize before
  // validating, matching against approved domains, and storing.
  const normalizedUrl = useMemo(() => normalizeListingUrl(urlTrimmed), [urlTrimmed]);
  const urlIsValid = normalizedUrl !== null;
  // isUrlApproved compares against a list of bare domain strings (e.g. "ebay.com"),
  // while fetchApprovedDomains() returns the full ApprovedDomain rows.
  const approvedDomainNames = useMemo(
    () => approvedDomains.map((d) => d.domain),
    [approvedDomains],
  );
  const urlApproved = normalizedUrl !== null && isUrlApproved(normalizedUrl, approvedDomainNames);

  const isDraft = existing?.status === 'Draft';
  const isPublished = existing != null && existing.status !== 'Draft';

  const validate = (publish: boolean): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!publish) return errs; // drafts save with anything missing (spec §4)
    if (listingType === 'sale') {
      const price = parseFloat(salePrice);
      if (!salePrice || Number.isNaN(price) || price <= 0) {
        errs.salePrice = t('listing.salePriceRequired');
      }
      if (!chatConsent) {
        errs.chatConsent = t('listing.chatConsentRequired');
      }
    } else {
      if (!auctionDate) errs.auctionDate = t('listing.auctionDateRequired');
      if (!auctionTime) errs.auctionTime = t('listing.auctionDateRequired');
      if (!auctionTz) errs.auctionTz = t('listing.auctionDateRequired');
      // URL must exist and be a valid URL; an unapproved one no longer blocks —
      // it publishes into the PendingUrl holding state (spec §5.3).
      if (!urlIsValid) errs.url = t('listing.auctionUrlRequired');
    }
    return errs;
  };

  const buildInput = (): ListingInput => ({
    listingType,
    currency,
    salePrice: listingType === 'sale' && salePrice ? parseFloat(salePrice) : null,
    publicRemark: publicRemark.trim() || null,
    externalListingUrl: normalizedUrl,
    isUrlApproved: urlApproved,
    isSold: listingType === 'sale' ? isSold : false,
    auctionAt: listingType === 'auction'
      ? combineAuctionDateTime(auctionDate, auctionTime, auctionTz)
      : null,
    auctionTimezone: listingType === 'auction' ? auctionTz || null : null,
    lotNumber: lotNumber.trim() || null,
    startPrice: startPrice ? parseFloat(startPrice) : null,
    estimatedPrice: estimatedPrice.trim() || null,
  });

  const handleSave = async (publish: boolean) => {
    if (!user?.id) return;
    const errs = validate(publish);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    if (chatConsent !== initialConsent) {
      // Consent is profile-level (spec §5.2); best-effort write.
      const { error: consentError } = await supabase
        .from('profiles')
        .update({
          chat_email_consent: chatConsent,
          chat_email_consent_at: chatConsent ? new Date().toISOString() : null,
        } as any)
        .eq('id', user.id);
      if (consentError) console.error('Error saving chat consent:', consentError);
      else setInitialConsent(chatConsent);
    }
    const result = await saveMarketplaceListing(collectionItemId, user.id, buildInput(), publish);
    setSaving(false);
    if (result === 'error') {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
      return;
    }
    toast({
      title:
        result === 'pending-url'
          ? t('listing.waitingUrlApproval')
          : result === 'published'
            ? t('listing.published')
            : t('listing.draftSaved'),
      description: result === 'pending-url' ? t('listing.waitingUrlApprovalNotice') : undefined,
    });
    onOpenChange(false);
    onSaved?.();
  };

  const handleDelete = async () => {
    setSaving(true);
    const ok = await removeFromMarketplace(collectionItemId, existing?.id);
    setSaving(false);
    if (ok) {
      toast({ title: t('listing.listingRemoved') });
      onOpenChange(false);
      onSaved?.();
    } else {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
  };

  const handleRequestApproval = async () => {
    if (!user?.id || !normalizedUrl) return;
    const ok = await createPendingDomainRequest(
      user.id,
      normalizeDomain(normalizedUrl),
      normalizedUrl,
      listingType
    );
    if (ok) setApprovalRequested(true);
  };

  const numericInput = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === '' || NUMERIC.test(e.target.value)) setter(e.target.value);
    };

  const urlWarning = urlTrimmed && urlIsValid && !urlApproved && (
    <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
        {t('listing.urlNotApprovedNotice')}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={approvalRequested} onClick={handleRequestApproval}>
        {approvalRequested ? t('item.approvalRequested', 'Approval Requested') : t('item.requestApproval', 'Request Approval')}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : requestClose())}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="pt-4">
          <DialogTitle>
            <span>
              {t('listing.manageListing')}
              {isDraft && <Badge variant="secondary" className="ml-2">{t('listing.draft')}</Badge>}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">…</div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={listingType} onValueChange={(v) => { setListingType(v as ListingType); setFieldErrors({}); }}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sale" id="listing-sale" />
                <Label htmlFor="listing-sale">{t('listing.saleOption')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auction" id="listing-auction" />
                <Label htmlFor="listing-auction">{t('listing.auctionOption')}</Label>
              </div>
            </RadioGroup>

            {listingType === 'sale' ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className={fieldErrors.salePrice ? 'text-destructive' : ''}>
                    {t('listing.salePrice')} *
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">{CURRENCY_SYMBOL[currency]}</span>
                      <Input
                        className={`pl-6 ${fieldErrors.salePrice ? 'border-destructive' : ''}`}
                        aria-invalid={Boolean(fieldErrors.salePrice)}
                        value={salePrice}
                        onChange={(e) => { numericInput(setSalePrice)(e); clearFieldError('salePrice'); }}
                      />
                    </div>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as ListingCurrency)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {fieldErrors.salePrice && (
                    <p className="text-sm font-medium text-destructive">{fieldErrors.salePrice}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.publicRemark')}</Label>
                  <Textarea value={publicRemark} onChange={(e) => setPublicRemark(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.addWebsiteUrl')}</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.ebay.com/itm/..." />
                  {urlWarning}
                </div>
                <p className="text-xs text-muted-foreground">{t('listing.checkChatNotice')}</p>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="listing-chat-consent"
                    checked={chatConsent}
                    className={fieldErrors.chatConsent ? 'border-destructive' : ''}
                    onCheckedChange={(v) => { setChatConsent(v === true); clearFieldError('chatConsent'); }}
                  />
                  <div>
                    <Label
                      htmlFor="listing-chat-consent"
                      className={fieldErrors.chatConsent ? 'text-destructive' : ''}
                    >
                      {t('listing.chatConsent')} *
                    </Label>
                    <p className="text-xs text-muted-foreground">{t('listing.chatConsentHint')}</p>
                    {fieldErrors.chatConsent && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.chatConsent}</p>
                    )}
                  </div>
                </div>
                {isPublished && (
                  <div className="flex items-start gap-2">
                    <Checkbox id="listing-sold" checked={isSold} onCheckedChange={(v) => setIsSold(v === true)} />
                    <div>
                      <Label htmlFor="listing-sold">{t('listing.itemSold')}</Label>
                      <p className="text-xs text-muted-foreground">{t('listing.itemSoldDescription')}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('listing.mustBeFilled')}</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 flex flex-col">
                    <Label className={fieldErrors.auctionDate ? 'text-destructive' : ''}>{t('listing.auctionDate')} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`w-full justify-start text-left font-normal transition-transform active:scale-[0.99] ${!auctionDate && 'text-muted-foreground'} ${fieldErrors.auctionDate ? 'border-destructive' : ''}`}
                          aria-invalid={Boolean(fieldErrors.auctionDate)}
                        >
                          {auctionDate
                            ? format(parseDateString(auctionDate)!, 'PPP')
                            : <span>{t('listing.pickADate', 'Pick a date')}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={parseDateString(auctionDate)}
                          onSelect={(date) => { setAuctionDate(date ? formatDateString(date) : ''); clearFieldError('auctionDate'); }}
                          disabled={(date) => date < startOfToday()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldErrors.auctionDate && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.auctionDate}</p>
                    )}
                  </div>
                  <div className="space-y-1 flex flex-col">
                    <Label className={fieldErrors.auctionTime ? 'text-destructive' : ''}>{t('listing.auctionTime')} *</Label>
                    <TimePicker
                      value={auctionTime}
                      onChange={(v) => { setAuctionTime(v); clearFieldError('auctionTime'); }}
                      placeholder={t('listing.pickATime', '--:--')}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className={fieldErrors.auctionTz ? 'text-destructive' : ''}>{t('listing.timezone')} *</Label>
                  <Select value={auctionTz} onValueChange={(v) => { setAuctionTz(v); clearFieldError('auctionTz'); }}>
                    <SelectTrigger className={fieldErrors.auctionTz ? 'border-destructive' : ''}>
                      <SelectValue placeholder="UTC+0:00" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {UTC_OFFSETS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.auctionTz && (
                    <p className="text-sm font-medium text-destructive">{fieldErrors.auctionTz}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.lotNumber')}</Label>
                  <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.currency')}</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as ListingCurrency)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('listing.startPrice')} ({currency})</Label>
                    <Input value={startPrice} onChange={numericInput(setStartPrice)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('listing.estimatedPrice')} ({currency})</Label>
                    <Input value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} placeholder={t('listing.estimatedPlaceholder')} />
                  </div>
                </div>
                {/* Price Realized is NOT part of this form (spec §8c): the owner
                    enters it on the item display once the auction has ended. */}
                <div className="space-y-1">
                  <Label>{t('listing.publicRemark')}</Label>
                  <Textarea value={publicRemark} onChange={(e) => setPublicRemark(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className={fieldErrors.url ? 'text-destructive' : ''}>{t('listing.auctionUrl')} *</Label>
                  <Input
                    className={fieldErrors.url ? 'border-destructive' : ''}
                    aria-invalid={Boolean(fieldErrors.url)}
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); clearFieldError('url'); }}
                    placeholder="https://..."
                  />
                  {fieldErrors.url && (
                    <p className="text-sm font-medium text-destructive">{fieldErrors.url}</p>
                  )}
                  {/* Auction: no manual request button — publishing an unapproved URL
                      queues it automatically and holds the item (spec §5.3).
                      Nothing has been submitted yet at this point, so the copy
                      describes what Publish will do. */}
                  {urlTrimmed && urlIsValid && !urlApproved && (
                    <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {t('listing.urlWillBeSubmittedNotice')}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('listing.archiveAfterAuction')}</p>
                <p className="text-xs text-muted-foreground">{t('listing.mustBeFilled')}</p>
              </div>
            )}

            {Object.keys(fieldErrors).length > 0 && (
              <div className="space-y-1" role="alert">
                {Array.from(new Set(Object.values(fieldErrors))).map((e) => (
                  <p key={e} className="text-sm font-medium text-destructive">{e}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {existing && (
                <Button type="button" variant="ghost" className="mr-auto text-destructive" disabled={saving} onClick={handleDelete}>
                  {isDraft ? t('listing.deleteDraft') : t('listing.removeListing')}
                </Button>
              )}
              <Button type="button" variant="outline" disabled={saving} onClick={requestClose}>
                {t('listing.cancel')}
              </Button>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => handleSave(false)}>
                {t('listing.saveDraft')}
              </Button>
              <Button type="button" disabled={saving} onClick={() => handleSave(true)}>
                {t('listing.publish')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle><span>{t('listing.cancelConfirmTitle')}</span></AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('listing.cancelConfirmBack')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelConfirm(false);
                onOpenChange(false);
              }}
            >
              {t('listing.cancelConfirmOk')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
