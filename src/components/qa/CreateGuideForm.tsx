import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { RawHtmlFrame } from '@/components/qa/RawHtmlFrame';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import {
  fetchQaCategories, fetchQaEntryById, createQaEntry, updateQaEntry,
  createQaCategory, uploadQaImage,
} from '@/services/qaService';
import type { QaCategory } from '@/types/qa';

const NEW_CATEGORY_VALUE = '__new__';

export function CreateGuideForm({ entryId }: { entryId?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['qa']);
  const { direction } = useLanguage();

  const [categories, setCategories] = useState<QaCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [headline, setHeadline] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  // 'rich' = Tiptap editor; 'html' = the content is a full HTML document stored
  // and rendered verbatim (the page IS the uploaded HTML).
  const [contentMode, setContentMode] = useState<'rich' | 'html'>('rich');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);

  // Load a .html file's raw contents into the HTML source box (verbatim — it is
  // NOT passed through the rich-text editor, which would strip the design).
  const handleHtmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const text = await file.text();
      setContent(text);
      setContentMode('html');
      toast({ title: tf('form.htmlLoaded', 'HTML file loaded') });
    } catch (err) {
      console.error('Error reading HTML file:', err);
      toast({ variant: 'destructive', title: tf('errors.saveFailed', 'Could not load the file.') });
    }
  };

  const tf = useMemo(
    () => (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  useEffect(() => {
    fetchQaCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!entryId) return;
    fetchQaEntryById(entryId).then((e) => {
      if (!e) return;
      setCategoryId(e.categoryId);
      setHeadline(e.headline);
      setShortDescription(e.shortDescription);
      setContent(e.content);
      setContentMode(e.contentIsRaw ? 'html' : 'rich');
    });
  }, [entryId]);

  const usingNewCategory = categoryId === NEW_CATEGORY_VALUE;
  // Full HTML content is optional: an entry can be published with just the
  // headline + short answer (it then shows in the FAQ list with no "Learn more").
  const canSubmit =
    !!user &&
    headline.trim().length > 0 &&
    shortDescription.trim().length > 0 &&
    (usingNewCategory ? newCategoryName.trim().length > 0 : categoryId.length > 0);

  const handleSubmit = async (asDraft: boolean) => {
    if (!canSubmit || !user) {
      toast({
        variant: 'destructive',
        title: tf('errors.saveFailed', 'Could not save.'),
        description: tf('errors.validation', 'Please fill in all fields.'),
      });
      return;
    }
    setIsSubmitting(true);
    try {
      let resolvedCategoryId = categoryId;
      if (usingNewCategory) {
        const created = await createQaCategory(newCategoryName.trim(), categories.length);
        if (!created) throw new Error('category creation failed');
        resolvedCategoryId = created.id;
      }

      const input = {
        categoryId: resolvedCategoryId,
        headline: headline.trim(),
        shortDescription: shortDescription.trim(),
        content,
        isDraft: asDraft,
        contentIsRaw: contentMode === 'html',
      };

      const saved = entryId
        ? await updateQaEntry(entryId, input)
        : await createQaEntry(input, user.id);

      if (!saved) throw new Error('save failed');

      toast({ title: tf('actions.save', 'Saved') });
      navigate('/guide');
    } catch (e) {
      console.error('Error saving qa entry:', e);
      toast({
        variant: 'destructive',
        title: tf('errors.saveFailed', 'Could not save. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
      <div className="mb-6">
        <Button type="button" variant="ghost" onClick={() => navigate('/guide')} className="flex items-center">
          {direction === 'rtl' ? <ArrowRight className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          {tf('backToGuide', 'Back to FAQ')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="qa-category">{tf('form.categoryLabel', 'Category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="qa-category">
                <SelectValue placeholder={tf('form.categoryLabel', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>{tf('form.newCategory', '+ New category')}</SelectItem>
              </SelectContent>
            </Select>
            {usingNewCategory && (
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={tf('form.newCategoryPlaceholder', 'New category name')}
                maxLength={80}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-headline">{tf('form.headlineLabel', 'Question (headline)')}</Label>
            <Input
              id="qa-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={tf('form.headlinePlaceholder', 'Question...')}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-short">{tf('form.shortLabel', 'Short answer')}</Label>
            <Textarea
              id="qa-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder={tf('form.shortPlaceholder', 'Short summary...')}
              maxLength={400}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label htmlFor="qa-content">
                {tf('form.contentLabel', 'Full answer')}{' '}
                <span className="text-xs font-normal text-muted-foreground">({tf('form.optional', 'optional')})</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border p-0.5">
                  <Button
                    type="button" size="sm"
                    variant={contentMode === 'rich' ? 'secondary' : 'ghost'}
                    onClick={() => setContentMode('rich')}
                  >
                    {tf('form.modeRich', 'Editor')}
                  </Button>
                  <Button
                    type="button" size="sm"
                    variant={contentMode === 'html' ? 'secondary' : 'ghost'}
                    onClick={() => setContentMode('html')}
                  >
                    {tf('form.modeHtml', 'HTML')}
                  </Button>
                </div>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => htmlFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {tf('form.uploadHtml', 'Upload HTML file')}
                </Button>
                <input
                  ref={htmlFileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  className="hidden"
                  onChange={handleHtmlFile}
                />
              </div>
            </div>

            {contentMode === 'rich' ? (
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder={tf('form.contentPlaceholder', 'Write the full answer...')}
                dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                onImageUpload={uploadQaImage}
              />
            ) : (
              <div className="space-y-2">
                <Textarea
                  id="qa-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={tf('form.htmlSourcePlaceholder', 'Paste a full HTML document, or use "Upload HTML file"...')}
                  rows={12}
                  dir="ltr"
                  className="font-mono text-xs"
                />
                {content.trim().length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{tf('form.preview', 'Preview')}</p>
                    <div className="border rounded-md overflow-hidden">
                      <RawHtmlFrame html={content} title="preview" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="px-6 py-4 border-t flex justify-between">
          <Button type="button" variant="outline" onClick={() => handleSubmit(true)} disabled={isSubmitting || !canSubmit}>
            {tf('form.draft', 'Save as draft')}
          </Button>
          <Button type="submit" disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tf('status.saving', 'Saving...')}</>
            ) : (
              tf('actions.publish', 'Publish')
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
