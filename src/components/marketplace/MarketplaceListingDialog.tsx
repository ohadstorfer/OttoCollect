import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  UTC_OFFSETS,
} from '@/lib/marketplaceListing';
import { ListingType, MarketplaceItem } from '@/types';

interface MarketplaceListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionItemId: string;
  onSaved?: () => void;
}

const NUMERIC = /^[0-9]*\.?[0-9]*$/;

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
  const [errors, setErrors] = useState<string[]>([]);

  const [listingType, setListingType] = useState<ListingType>('sale');
  const [salePrice, setSalePrice] = useState('');
  const [publicRemark, setPublicRemark] = useState('');
  const [url, setUrl] = useState('');
  const [isSold, setIsSold] = useState(false);
  const [auctionDate, setAuctionDate] = useState('');
  const [auctionTime, setAuctionTime] = useState('');
  const [auctionTz, setAuctionTz] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [realizedPrice, setRealizedPrice] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErrors([]);
    setApprovalRequested(false);
    Promise.all([
      getMarketplaceItemForCollectionItem(collectionItemId),
      fetchApprovedDomains(),
    ]).then(([item, domains]) => {
      if (cancelled) return;
      setApprovedDomains(domains);
      setExisting(item);
      if (item) {
        setListingType((item.listing_type ?? 'sale') as ListingType);
        setSalePrice(item.collectionItem?.salePrice ? String(item.collectionItem.salePrice) : '');
        setPublicRemark(item.public_remark ?? '');
        setUrl(item.external_listing_url ?? '');
        setIsSold(Boolean(item.is_sold));
        setLotNumber(item.lot_number ?? '');
        setStartPrice(item.start_price != null ? String(item.start_price) : '');
        setEstimatedPrice(item.estimated_price ?? '');
        setRealizedPrice(item.realized_price != null ? String(item.realized_price) : '');
        setAuctionTz(item.auction_timezone ?? '');
        if (item.auction_at) {
          const { date, time } = splitAuctionDateTime(item.auction_at, item.auction_timezone ?? null);
          setAuctionDate(date);
          setAuctionTime(time);
        } else {
          setAuctionDate('');
          setAuctionTime('');
        }
      } else {
        setListingType('sale');
        setSalePrice(''); setPublicRemark(''); setUrl(''); setIsSold(false);
        setAuctionDate(''); setAuctionTime(''); setAuctionTz('');
        setLotNumber(''); setStartPrice(''); setEstimatedPrice(''); setRealizedPrice('');
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, collectionItemId]);

  const urlTrimmed = url.trim();
  const urlIsValid = useMemo(() => {
    if (!urlTrimmed) return false;
    try { new URL(urlTrimmed); return true; } catch { return false; }
  }, [urlTrimmed]);
  // isUrlApproved compares against a list of bare domain strings (e.g. "ebay.com"),
  // while fetchApprovedDomains() returns the full ApprovedDomain rows.
  const approvedDomainNames = useMemo(
    () => approvedDomains.map((d) => d.domain),
    [approvedDomains],
  );
  const urlApproved = urlIsValid && isUrlApproved(urlTrimmed, approvedDomainNames);

  const isDraft = existing?.status === 'Draft';
  const isPublished = existing != null && existing.status !== 'Draft';

  const validate = (publish: boolean): string[] => {
    const errs: string[] = [];
    if (listingType === 'sale') {
      const price = parseFloat(salePrice);
      if (publish && (!salePrice || Number.isNaN(price) || price <= 0)) {
        errs.push(t('listing.salePriceRequired'));
      }
    } else {
      if (publish && !combineAuctionDateTime(auctionDate, auctionTime, auctionTz)) {
        errs.push(t('listing.auctionDateRequired'));
      }
      if (publish && (!urlIsValid || !urlApproved)) {
        errs.push(t('listing.auctionUrlRequired'));
      }
    }
    return errs;
  };

  const buildInput = (): ListingInput => ({
    listingType,
    salePrice: listingType === 'sale' && salePrice ? parseFloat(salePrice) : null,
    publicRemark: publicRemark.trim() || null,
    externalListingUrl: urlTrimmed || null,
    isUrlApproved: urlApproved,
    isSold: listingType === 'sale' ? isSold : false,
    auctionAt: listingType === 'auction'
      ? combineAuctionDateTime(auctionDate, auctionTime, auctionTz)
      : null,
    auctionTimezone: listingType === 'auction' ? auctionTz || null : null,
    lotNumber: lotNumber.trim() || null,
    startPrice: startPrice ? parseFloat(startPrice) : null,
    estimatedPrice: estimatedPrice.trim() || null,
    realizedPrice: realizedPrice ? parseFloat(realizedPrice) : null,
  });

  const handleSave = async (publish: boolean) => {
    if (!user?.id) return;
    const errs = validate(publish);
    setErrors(errs);
    if (errs.length > 0) return;
    setSaving(true);
    const ok = await saveMarketplaceListing(collectionItemId, user.id, buildInput(), publish);
    setSaving(false);
    if (ok) {
      toast({ title: publish ? t('listing.published') : t('listing.draftSaved') });
      onOpenChange(false);
      onSaved?.();
    } else {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
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
    if (!user?.id || !urlIsValid) return;
    const ok = await createPendingDomainRequest(user.id, normalizeDomain(urlTrimmed), urlTrimmed);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
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
            <RadioGroup value={listingType} onValueChange={(v) => { setListingType(v as ListingType); setErrors([]); }}>
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
                  <Label>{t('listing.salePrice')} * (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input className="pl-6" value={salePrice} onChange={numericInput(setSalePrice)} />
                  </div>
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
                  <div className="space-y-1">
                    <Label>{t('listing.auctionDate')} *</Label>
                    <Input type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('listing.auctionTime')} *</Label>
                    <Input type="time" value={auctionTime} onChange={(e) => setAuctionTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.timezone')} *</Label>
                  <Select value={auctionTz} onValueChange={setAuctionTz}>
                    <SelectTrigger><SelectValue placeholder="UTC+0:00" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {UTC_OFFSETS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.lotNumber')}</Label>
                  <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('listing.startPrice')} (USD)</Label>
                    <Input value={startPrice} onChange={numericInput(setStartPrice)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('listing.estimatedPrice')} (USD)</Label>
                    <Input value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} placeholder={t('listing.estimatedPlaceholder')} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.realizedPrice')} (USD)</Label>
                  <Input value={realizedPrice} onChange={numericInput(setRealizedPrice)} />
                  <p className="text-xs text-muted-foreground">{t('listing.realizedPriceDescription')}</p>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.publicRemark')}</Label>
                  <Textarea value={publicRemark} onChange={(e) => setPublicRemark(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.auctionUrl')} *</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                  {urlWarning}
                </div>
                <p className="text-xs text-muted-foreground">{t('listing.archiveAfterAuction')}</p>
                <p className="text-xs text-muted-foreground">{t('listing.mustBeFilled')}</p>
              </div>
            )}

            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((e) => (
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
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
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
    </Dialog>
  );
}
