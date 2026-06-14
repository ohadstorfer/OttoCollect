import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import {
  fetchCreditLinks, createCreditLink, updateCreditLink, deleteCreditLink,
  type CreditLink,
} from '@/services/creditLinksService';

const CreditsLinks = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { direction } = useLanguage();
  const { t } = useTranslation(['creditsLinks']);

  const [links, setLinks] = useState<CreditLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline editor state: editingId === 'new' means the add row; otherwise a row id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'Super Admin';

  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  const load = () => {
    setLoading(true);
    fetchCreditLinks()
      .then(setLinks)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => {
    setEditingId('new');
    setDraftName('');
    setDraftUrl('');
  };

  const startEdit = (link: CreditLink) => {
    setEditingId(link.id);
    setDraftName(link.name);
    setDraftUrl(link.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftUrl('');
  };

  const saveEdit = async () => {
    const name = draftName.trim();
    const url = draftUrl.trim();
    if (!name || !url) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        await createCreditLink(name, url);
      } else if (editingId) {
        await updateCreditLink(editingId, { name, url });
      }
      cancelEdit();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tf('status_deleteConfirm', 'Delete this link permanently?'))) return;
    await deleteCreditLink(id);
    load();
  };

  const editorRow = (
    <div className="flex flex-col sm:flex-row gap-2 py-3 border-b border-border">
      <Input
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        placeholder={tf('form.namePlaceholder', 'Display name')}
        className="sm:max-w-xs"
      />
      <Input
        value={draftUrl}
        onChange={(e) => setDraftUrl(e.target.value)}
        placeholder={tf('form.urlPlaceholder', 'https://example.com')}
        className="flex-1"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={saveEdit} disabled={saving || !draftName.trim() || !draftUrl.trim()}>
          <Check className="h-4 w-4 mr-1" />{tf('actions.save', 'Save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
          <X className="h-4 w-4 mr-1" />{tf('actions.cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <SEOHead
        title={SEO_CONFIG.pages.credits.title}
        description={SEO_CONFIG.pages.credits.description}
        keywords={SEO_CONFIG.pages.credits.keywords}
        type="website"
        canonical="https://ottocollect.com/credits/"
      />

      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 mb-10`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
            <span>{tf('title', 'Credits & Links')}</span>
          </h1>
          <p className={`mt-4 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto`}>
            {tf('subtitle', 'Useful links and the people and projects we credit.')}
          </p>
        </div>
      </section>

      <div className="page-container">
        <div className="max-w-3xl mx-auto px-4">
          {isSuperAdmin && editingId !== 'new' && (
            <div className="flex justify-end mb-6">
              <Button variant="outline" size="sm" onClick={startAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {tf('actions.add', 'Add link')}
              </Button>
            </div>
          )}

          {isSuperAdmin && editingId === 'new' && editorRow}

          {loading ? (
            <div className="text-center py-10">{tf('status.loading', 'Loading...')}</div>
          ) : links.length === 0 && editingId !== 'new' ? (
            <div className="text-center py-10">{tf('status.empty', 'No links yet.')}</div>
          ) : (
            <ul className="divide-y divide-border">
              {links.map((link) => (
                <li key={link.id}>
                  {editingId === link.id ? (
                    editorRow
                  ) : (
                    <div className={`flex items-center justify-between gap-3 py-3 ${direction === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium break-all"
                      >
                        {link.name}
                      </a>
                      {isSuperAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(link)} aria-label={tf('actions.edit', 'Edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(link.id)} aria-label={tf('actions.delete', 'Delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditsLinks;
