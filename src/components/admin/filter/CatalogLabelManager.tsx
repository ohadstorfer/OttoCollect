import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2 } from 'lucide-react';

interface CatalogLabelManagerProps {
  countryId: string;
}

export default function CatalogLabelManager({ countryId }: CatalogLabelManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [labelAr, setLabelAr] = useState('');
  const [labelTr, setLabelTr] = useState('');

  useEffect(() => {
    const fetchLabel = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('countries')
        .select('turk_catalog_label, turk_catalog_label_ar, turk_catalog_label_tr')
        .eq('id', countryId)
        .single();

      if (!error && data) {
        setLabel(data.turk_catalog_label || '');
        setLabelAr(data.turk_catalog_label_ar || '');
        setLabelTr(data.turk_catalog_label_tr || '');
      }
      setLoading(false);
    };

    if (countryId) fetchLabel();
  }, [countryId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('countries')
      .update({
        turk_catalog_label: label || null,
        turk_catalog_label_ar: labelAr || null,
        turk_catalog_label_tr: labelTr || null,
      })
      .eq('id', countryId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save label', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Catalog number label updated successfully' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set a custom label to replace "Turk Catalog Number" for this country. Leave empty to use the default.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="catalog-label-en">English Label</Label>
          <Input
            id="catalog-label-en"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Turk Catalog Number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="catalog-label-ar">Arabic Label</Label>
          <Input
            id="catalog-label-ar"
            value={labelAr}
            onChange={(e) => setLabelAr(e.target.value)}
            placeholder="رقم كتالوج تورك"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="catalog-label-tr">Turkish Label</Label>
          <Input
            id="catalog-label-tr"
            value={labelTr}
            onChange={(e) => setLabelTr(e.target.value)}
            placeholder="Türk Katalog Numarası"
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save
      </Button>
    </div>
  );
}
