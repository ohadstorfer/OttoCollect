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
import { Trash2, Plus } from 'lucide-react';
import {
  fetchApprovedDomains,
  addApprovedDomain,
  deleteApprovedDomain,
  normalizeDomain,
  type ApprovedDomain
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

  useEffect(() => {
    loadDomains();
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
            <DialogTitle>{t('urls.addApprovedDomain')}</DialogTitle>
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
    </div>
  );
};

export default ApprovedDomainsManager;
