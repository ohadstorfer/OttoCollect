import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  fetchCategoriesByCountryId,
  fetchTypesByCountryId,
  fetchSortOptionsByCountryId,
  fetchAllCountryDefaultPreferences,
  saveCountryDefaultPreferences,
  applyCountryDefaultToAllUsers,
} from '@/services/countryService';
import type {
  CategoryDefinition,
  TypeDefinition,
  SortOption,
  CatalogDefaultAudience,
  CountryDefaultPreference,
} from '@/types/filter';

interface CatalogDefaultsManagerProps {
  countryId: string;
}

interface DefaultsDraft {
  group_mode: boolean;
  view_mode: 'grid' | 'list';
  images_only: boolean;
  selected_categories: string[];
  selected_types: string[];
  selected_sort_options: string[];
}

const emptyDraft = (): DefaultsDraft => ({
  group_mode: true,
  view_mode: 'grid',
  images_only: true,
  selected_categories: [],
  selected_types: [],
  selected_sort_options: [],
});

const fromRow = (row: CountryDefaultPreference | null, fallback: DefaultsDraft): DefaultsDraft => {
  if (!row) return fallback;
  return {
    group_mode: row.group_mode,
    view_mode: row.view_mode,
    images_only: row.images_only,
    selected_categories: row.selected_categories ?? [],
    selected_types: row.selected_types ?? [],
    selected_sort_options: row.selected_sort_options ?? [],
  };
};

const CatalogDefaultsManager: React.FC<CatalogDefaultsManagerProps> = ({ countryId }) => {
  const { t } = useTranslation(['admin']);
  const { toast } = useToast();

  const [audience, setAudience] = useState<CatalogDefaultAudience>('anonymous');
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [types, setTypes] = useState<TypeDefinition[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [drafts, setDrafts] = useState<Record<CatalogDefaultAudience, DefaultsDraft>>({
    anonymous: emptyDraft(),
    new_user: emptyDraft(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [cats, tps, sorts, rows] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId),
          fetchAllCountryDefaultPreferences(countryId),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setTypes(tps);
        setSortOptions(sorts);
        const allCatIds = cats.map(c => c.id);
        const allTypeIds = tps.map(t => t.id);
        const allSortIds = sorts.map(s => s.id);
        setDrafts({
          anonymous: fromRow(rows.anonymous, {
            ...emptyDraft(),
            group_mode: false,
            selected_categories: allCatIds,
            selected_types: allTypeIds,
            selected_sort_options: allSortIds,
          }),
          new_user: fromRow(rows.new_user, {
            ...emptyDraft(),
            selected_categories: allCatIds,
            selected_types: allTypeIds,
            selected_sort_options: allSortIds,
          }),
        });
      } catch (err) {
        console.error('Failed to load catalog defaults', err);
        toast({
          title: t('catalogDefaults.errors.loadTitle', 'Could not load defaults'),
          description: t('catalogDefaults.errors.loadDescription', 'Please try again.'),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [countryId, toast, t]);

  const current = drafts[audience];

  const update = (patch: Partial<DefaultsDraft>) => {
    setDrafts(prev => ({ ...prev, [audience]: { ...prev[audience], ...patch } }));
  };

  const toggleArray = (field: keyof DefaultsDraft, id: string) => {
    const arr = current[field] as string[];
    update({ [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } as Partial<DefaultsDraft>);
  };

  const selectAll = (field: 'selected_categories' | 'selected_types' | 'selected_sort_options', ids: string[]) => {
    update({ [field]: ids } as Partial<DefaultsDraft>);
  };

  const clearAll = (field: 'selected_categories' | 'selected_types' | 'selected_sort_options') => {
    update({ [field]: [] } as Partial<DefaultsDraft>);
  };

  const persist = async (applyToAll: boolean) => {
    setSaving(true);
    try {
      await saveCountryDefaultPreferences(countryId, audience, current);
      if (applyToAll && audience === 'new_user') {
        await applyCountryDefaultToAllUsers(countryId);
      }
      toast({
        title: t('catalogDefaults.saved', 'Defaults saved'),
      });
    } catch (err) {
      toast({
        title: t('catalogDefaults.errors.saveTitle', 'Could not save defaults'),
        description: t('catalogDefaults.errors.saveDescription', 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setScopeOpen(false);
    }
  };

  const handleSave = () => {
    // For new_user, let the admin choose whether to also overwrite existing
    // users. Anonymous has no per-user rows, so it just saves.
    if (audience === 'new_user') {
      setScopeOpen(true);
    } else {
      persist(false);
    }
  };

  const audienceLabel = useMemo(
    () => ({
      anonymous: t('catalogDefaults.audience.anonymous', 'Anonymous visitors'),
      new_user: t('catalogDefaults.audience.newUser', 'New registered users'),
    }),
    [t]
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          {t('catalogDefaults.loading', 'Loading defaults...')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">
          {t('catalogDefaults.audienceLabel', 'Audience')}
        </Label>
        <ToggleGroup
          type="single"
          value={audience}
          onValueChange={(v) => v && setAudience(v as CatalogDefaultAudience)}
          className="justify-start"
        >
          <ToggleGroupItem value="anonymous">{audienceLabel.anonymous}</ToggleGroupItem>
          <ToggleGroupItem value="new_user">{audienceLabel.new_user}</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground mt-2">
          {audience === 'anonymous'
            ? t('catalogDefaults.audience.anonymousHelp', 'Applied to visitors without an account.')
            : t('catalogDefaults.audience.newUserHelp', 'Applied at signup. Does not affect users who already have saved preferences.')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('catalogDefaults.fields.viewMode', 'Default view')}</Label>
          <RadioGroup
            value={current.view_mode}
            onValueChange={(v) => update({ view_mode: v as 'grid' | 'list' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="grid" id="view-mode-grid" />
              <Label htmlFor="view-mode-grid">{t('catalogDefaults.viewMode.grid', 'Grid')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="list" id="view-mode-list" />
              <Label htmlFor="view-mode-list">{t('catalogDefaults.viewMode.list', 'List')}</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="group-mode-toggle">
              {t('catalogDefaults.fields.groupMode', 'Group Mode')}
            </Label>
            <Switch
              id="group-mode-toggle"
              checked={current.group_mode}
              onCheckedChange={(v) => update({ group_mode: !!v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="images-only-toggle">
              {t('catalogDefaults.fields.imagesOnly', 'Images only')}
            </Label>
            <Switch
              id="images-only-toggle"
              checked={current.images_only}
              onCheckedChange={(v) => update({ images_only: !!v })}
            />
          </div>
        </div>
      </div>

      <CheckboxList
        title={t('catalogDefaults.fields.categories', 'Pre-selected categories')}
        items={categories.map(c => ({ id: c.id, label: c.name }))}
        selected={current.selected_categories}
        onToggle={(id) => toggleArray('selected_categories', id)}
        onSelectAll={() => selectAll('selected_categories', categories.map(c => c.id))}
        onClear={() => clearAll('selected_categories')}
        selectAllLabel={t('catalogDefaults.selectAll', 'Select all')}
        clearLabel={t('catalogDefaults.clear', 'Clear')}
        emptyLabel={t('catalogDefaults.empty.categories', 'No categories defined for this country.')}
      />

      <CheckboxList
        title={t('catalogDefaults.fields.types', 'Pre-selected types')}
        items={types.map(tp => ({ id: tp.id, label: tp.name }))}
        selected={current.selected_types}
        onToggle={(id) => toggleArray('selected_types', id)}
        onSelectAll={() => selectAll('selected_types', types.map(tp => tp.id))}
        onClear={() => clearAll('selected_types')}
        selectAllLabel={t('catalogDefaults.selectAll', 'Select all')}
        clearLabel={t('catalogDefaults.clear', 'Clear')}
        emptyLabel={t('catalogDefaults.empty.types', 'No types defined for this country.')}
      />

      <CheckboxList
        title={t('catalogDefaults.fields.sortOptions', 'Pre-selected sort options')}
        items={sortOptions.map(s => ({ id: s.id, label: s.name }))}
        selected={current.selected_sort_options}
        onToggle={(id) => toggleArray('selected_sort_options', id)}
        onSelectAll={() => selectAll('selected_sort_options', sortOptions.map(s => s.id))}
        onClear={() => clearAll('selected_sort_options')}
        selectAllLabel={t('catalogDefaults.selectAll', 'Select all')}
        clearLabel={t('catalogDefaults.clear', 'Clear')}
        emptyLabel={t('catalogDefaults.empty.sortOptions', 'No sort options defined for this country.')}
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('catalogDefaults.saving', 'Saving...') : t('catalogDefaults.save', 'Save defaults')}
        </Button>
      </div>

      <AlertDialog open={scopeOpen} onOpenChange={(open) => !saving && setScopeOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('catalogDefaults.applyScope.title', 'Apply to which users?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'catalogDefaults.applyScope.description',
                'This default always applies to future signups. You can also overwrite the preferences of all existing users for this country — including those who customized their filters. That cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={saving}>
              {t('catalogDefaults.applyScope.cancel', 'Cancel')}
            </AlertDialogCancel>
            <Button variant="outline" onClick={() => persist(false)} disabled={saving}>
              {t('catalogDefaults.applyScope.newOnly', 'New users only')}
            </Button>
            <Button onClick={() => persist(true)} disabled={saving}>
              {saving
                ? t('catalogDefaults.saving', 'Saving...')
                : t('catalogDefaults.applyScope.all', 'All users (overwrite)')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface CheckboxListProps {
  title: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  selectAllLabel: string;
  clearLabel: string;
  emptyLabel: string;
}

const CheckboxList: React.FC<CheckboxListProps> = ({
  title, items, selected, onToggle, onSelectAll, onClear, selectAllLabel, clearLabel, emptyLabel,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <Label className="text-base font-medium">{title}</Label>
      {items.length > 0 && (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll}>
            {selectAllLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        </div>
      )}
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    ) : (
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 border rounded-md p-3">
        {items.map(item => (
          <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    )}
  </div>
);

export default CatalogDefaultsManager;
