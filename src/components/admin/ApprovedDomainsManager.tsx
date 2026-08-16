import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Trash2, Plus, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import {
  fetchApprovedDomains,
  addApprovedDomain,
  deleteApprovedDomain,
  normalizeDomain,
  fetchPendingDomainRequests,
  fetchRejectedDomains,
  approveDomain,
  rejectDomain,
  restoreRejectedDomain,
  type ApprovedDomain,
  type PendingDomainRequest,
  type RejectedDomain
} from '@/services/approvedDomainsService';

const ApprovedDomainsManager: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation(['admin']);
  const [domains, setDomains] = useState<ApprovedDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<ApprovedDomain | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [pendingRequests, setPendingRequests] = useState<PendingDomainRequest[]>([]);
  const [rejectedDomains, setRejectedDomains] = useState<RejectedDomain[]>([]);

  useEffect(() => {
    loadDomains();
    loadPendingRequests();
    loadRejectedDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const data = await fetchApprovedDomains();
      setDomains(data);
    } catch (error) {
      console.error("Error loading approved domains:", error);
      toast({
        title: t('urls.failedToLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    const data = await fetchPendingDomainRequests();
    setPendingRequests(data);
  };

  const loadRejectedDomains = async () => {
    const data = await fetchRejectedDomains();
    setRejectedDomains(data);
  };

  const reloadAll = () => {
    loadDomains();
    loadPendingRequests();
    loadRejectedDomains();
  };

  // approve/reject/restore run through Super-Admin security-definer RPCs —
  // the approval also attaches links and promotes PendingUrl auctions.
  const handleApproveDomain = async (domain: string) => {
    const success = await approveDomain(domain);
    if (success) {
      toast({ title: t('urls.domainAdded', { domain }) });
      reloadAll();
    } else {
      toast({ title: t('urls.failedToAdd'), variant: "destructive" });
    }
  };

  const handleRejectDomain = async (domain: string) => {
    const success = await rejectDomain(domain);
    if (success) {
      toast({ title: t('urls.requestRejected', { domain, defaultValue: `Requests for "${domain}" rejected` }) });
      reloadAll();
    }
  };

  const handleRestoreDomain = async (domain: string) => {
    const success = await restoreRejectedDomain(domain);
    if (success) {
      toast({ title: t('urls.domainRestored', { domain, defaultValue: `"${domain}" moved back to pending` }) });
      reloadAll();
    }
  };

  const handleAdd = async () => {
    const normalized = normalizeDomain(newDomain);
    if (!normalized) {
      toast({
        title: t('urls.domainRequired'),
        variant: "destructive",
      });
      return;
    }

    if (domains.some(d => d.domain === normalized)) {
      toast({
        title: t('urls.domainAlreadyExists', { domain: normalized }),
        variant: "destructive",
      });
      return;
    }

    const success = await addApprovedDomain(normalized);
    if (success) {
      toast({ title: t('urls.domainAdded', { domain: normalized }) });
      setShowAddDialog(false);
      setNewDomain('');
      loadDomains();
    } else {
      toast({ title: t('urls.failedToAdd'), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedDomain) return;

    const success = await deleteApprovedDomain(selectedDomain.id);
    if (success) {
      toast({ title: t('urls.domainRemoved', { domain: selectedDomain.domain }) });
      setShowDeleteDialog(false);
      setSelectedDomain(null);
      loadDomains();
    } else {
      toast({ title: t('urls.failedToDelete'), variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {t('urls.description')}
        </p>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('urls.addDomain')}
        </Button>
      </div>

      <h4 className="text-lg font-medium mb-2"><span>{t('urls.approvedList', 'Approved sites')}</span></h4>
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">{t('urls.loading')}</p>
      ) : domains.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {t('urls.noDomains')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('urls.domain')}</TableHead>
              <TableHead>{t('urls.added')}</TableHead>
              <TableHead className="w-[80px]">{t('urls.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell className="font-medium">{domain.domain}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(domain.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedDomain(domain);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>{t('urls.addApprovedDomain')}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="domain">{t('urls.domain')}</Label>
              <Input
                id="domain"
                placeholder={t('urls.domainPlaceholder')}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('urls.domainHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setNewDomain(''); }}>
              {t('urls.cancel')}
            </Button>
            <Button onClick={handleAdd}>{t('urls.addDomain')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('urls.deleteApprovedDomain')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('urls.deleteConfirmation', { domain: selectedDomain?.domain })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedDomain(null)}>{t('urls.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('urls.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Approval Requests (spec §6a: date | URL | user | sale type) */}
      {pendingRequests.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-medium mb-4"><span>{t('urls.pendingList', 'Pending approval')}</span></h4>
          {(() => {
            // Group requests by domain — approve/reject act on the whole domain.
            const grouped = new Map<string, PendingDomainRequest[]>();
            pendingRequests.forEach(req => {
              const list = grouped.get(req.domain) || [];
              list.push(req);
              grouped.set(req.domain, list);
            });

            return Array.from(grouped.entries()).map(([domain, requests]) => (
              <div key={domain} className="mb-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-lg">{domain}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveDomain(domain)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('urls.approve', 'Approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectDomain(domain)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t('urls.reject', 'Reject')}
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('urls.requestDate', 'Request date')}</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>{t('urls.username', 'User')}</TableHead>
                      <TableHead>{t('urls.saleType', 'Sale type')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <a href={req.requested_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate inline-block max-w-[280px] align-bottom">
                            {req.requested_url}
                          </a>
                        </TableCell>
                        <TableCell>{req.profiles?.username || 'Unknown'}</TableCell>
                        <TableCell>
                          {req.listing_type === 'auction'
                            ? 'Auction'
                            : req.listing_type === 'sale'
                              ? 'Buy now'
                              : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Rejected sites (spec §6a: date | URL | user | sale type, with Restore) */}
      {rejectedDomains.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-medium mb-4"><span>{t('urls.rejectedList', 'Rejected sites')}</span></h4>
          {(() => {
            const grouped = new Map<string, RejectedDomain[]>();
            rejectedDomains.forEach(rej => {
              const list = grouped.get(rej.domain) || [];
              list.push(rej);
              grouped.set(rej.domain, list);
            });

            return Array.from(grouped.entries()).map(([domain, rows]) => (
              <div key={domain} className="mb-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-lg">{domain}</span>
                  <Button size="sm" variant="outline" onClick={() => handleRestoreDomain(domain)}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('urls.restore', 'Restore')}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('urls.rejectedDate', 'Rejected date')}</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>{t('urls.username', 'User')}</TableHead>
                      <TableHead>{t('urls.saleType', 'Sale type')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(rej => (
                      <TableRow key={rej.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(rej.rejected_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {rej.requested_url ? (
                            <a href={rej.requested_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate inline-block max-w-[280px] align-bottom">
                              {rej.requested_url}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{rej.profiles?.username || 'Unknown'}</TableCell>
                        <TableCell>
                          {rej.listing_type === 'auction'
                            ? 'Auction'
                            : rej.listing_type === 'sale'
                              ? 'Buy now'
                              : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
};

export default ApprovedDomainsManager;
