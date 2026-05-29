import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { ResizableImage } from '@/components/shared/editor/ResizableImage';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { LineHeight } from '@/components/shared/editor/LineHeight';
import { FontSize } from '@/components/shared/editor/FontSize';
import { FontFamily } from '@/components/shared/editor/FontFamily';
import { ParagraphSpacing } from '@/components/shared/editor/ParagraphSpacing';
import { ColorPalette } from '@/components/shared/editor/ColorPalette';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Link2Off, Image as ImageIcon, Loader2,
  Undo2, Redo2, AlignVerticalSpaceAround, ChevronDown,
  Type, Pilcrow, CaseSensitive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'];
// Word measures font size in points (pt), CSS in pixels (px) — they are NOT
// the same: 1pt = 1.333px. So a "16" in our old px-based dropdown rendered
// ~25% smaller than the same nominal size in Word. Using pt here makes every
// number in this dropdown match the equivalent size in Word exactly. The
// values list mirrors Word's standard dropdown.
const FONT_SIZES = ['8pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt', '48pt'];
// Small Word-like font picker: labels are what the user sees; values are the
// CSS font-family stacks. Keep this list short — exposing every system font
// makes the dropdown noisy and most of them aren't installed anyway.
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];
// Numeric em-based options for the gap after a paragraph/heading. Labels match
// the values so the user sees exactly what they're picking (mirrors the
// line-height dropdown, which also exposes raw numeric values).
const PARAGRAPH_SPACINGS: { label: string; value: string }[] = [
  { label: '0', value: '0' },
  { label: '0.25', value: '0.25em' },
  { label: '0.5', value: '0.5em' },
  { label: '0.75', value: '0.75em' },
  { label: '1', value: '1em' },
  { label: '1.5', value: '1.5em' },
  { label: '2', value: '2em' },
];

interface RichTextEditorProps {
  /** Current HTML value. */
  value: string;
  /** Called with the new HTML on every edit. */
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Text direction for the editing surface. */
  dir?: 'ltr' | 'rtl';
  /**
   * Optional image upload handler. When provided, an "insert image" button is
   * shown; the returned URL is embedded into the document.
   */
  onImageUpload?: (file: File) => Promise<string>;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors',
        'hover:bg-muted disabled:opacity-40 disabled:pointer-events-none',
        active && 'bg-muted text-primary'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px self-center bg-border" aria-hidden />;
}

function Toolbar({
  editor,
  onImageUpload,
}: {
  editor: Editor;
  onImageUpload?: (file: File) => Promise<string>;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const currentLineHeight =
    (editor.getAttributes('paragraph').lineHeight as string | undefined) ||
    (editor.getAttributes('heading').lineHeight as string | undefined);
  const currentFontSize = editor.getAttributes('textStyle').fontSize as string | undefined;
  // Local editable buffer for the font-size input: lets the user type a custom
  // number (e.g. 13, 22, 100) without losing intermediate keystrokes. We
  // commit on Enter / blur. Kept in sync with the editor's current size as
  // the caret moves around different text.
  const [fontSizeInput, setFontSizeInput] = React.useState('');
  React.useEffect(() => {
    setFontSizeInput(currentFontSize ? String(parseInt(currentFontSize, 10)) : '');
  }, [currentFontSize]);
  const applyFontSize = useCallback(
    (raw: string) => {
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0 || n > 400) return;
      editor.chain().focus().setFontSize(`${n}pt`).run();
    },
    [editor]
  );
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily as string | undefined;
  const currentFontFamilyLabel =
    FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label ??
    (currentFontFamily ? currentFontFamily.split(',')[0].replace(/['"]/g, '') : 'Default');
  const currentSpacing =
    (editor.getAttributes('paragraph').marginBottom as string | undefined) ||
    (editor.getAttributes('heading').marginBottom as string | undefined);
  const currentColor = editor.getAttributes('textStyle').color as string | undefined;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl || 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!onImageUpload) return;
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image.' });
        return;
      }
      setUploading(true);
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error('Error uploading editor image:', error);
        toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload the image.' });
      } finally {
        setUploading(false);
      }
    },
    [editor, onImageUpload, toast]
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Clearing the fontSize mark on the selection before toggling the heading
          ensures the heading shows its native CSS size — otherwise a leftover
          inline `font-size` on a span overrides h1/h2/h3 and makes headings
          look inconsistent. */}
      <ToolbarButton title="Heading 1" onClick={() => editor.chain().focus().unsetFontSize().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" onClick={() => editor.chain().focus().unsetFontSize().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 3" onClick={() => editor.chain().focus().unsetFontSize().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Font"
            aria-label="Font"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-foreground transition-colors hover:bg-muted"
          >
            <CaseSensitive className="h-4 w-4" />
            <span
              className="text-xs max-w-[7rem] truncate"
              style={currentFontFamily ? { fontFamily: currentFontFamily } : undefined}
            >
              {currentFontFamilyLabel}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.value}
              onSelect={() => editor.chain().focus().setFontFamily(f.value).run()}
              className={cn(currentFontFamily === f.value && 'bg-muted font-medium')}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetFontFamily().run()}>
            Default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size: editable input + chevron that opens the preset list.
          The input accepts any positive integer (pt), matching Word's UX
          where you can either type 13, 22, 100... or pick from the menu. */}
      <div
        className="inline-flex h-8 items-center rounded-md text-foreground transition-colors hover:bg-muted"
        title="Text size"
      >
        <span className="pl-1.5 pr-0.5"><Type className="h-4 w-4" /></span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Text size"
          value={fontSizeInput}
          placeholder="—"
          onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyFontSize(fontSizeInput);
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={() => applyFontSize(fontSizeInput)}
          className="w-7 bg-transparent text-center text-xs tabular-nums focus:outline-none"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Text size presets"
              aria-label="Text size presets"
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex h-8 items-center rounded-md px-1 hover:bg-muted/60"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[5rem]">
            {FONT_SIZES.map((s) => (
              <DropdownMenuItem
                key={s}
                onSelect={() => editor.chain().focus().setFontSize(s).run()}
                className={cn(currentFontSize === s && 'bg-muted font-medium')}
              >
                {parseInt(s, 10)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => editor.chain().focus().unsetFontSize().run()}>
              Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Divider />

      <ToolbarButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      {/* Line spacing (within a paragraph) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Line spacing (within a paragraph)"
            aria-label="Line spacing"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground transition-colors hover:bg-muted"
          >
            <AlignVerticalSpaceAround className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[7rem]">
          {LINE_HEIGHTS.map((h) => (
            <DropdownMenuItem
              key={h}
              onSelect={() => editor.chain().focus().setLineHeight(h).run()}
              className={cn(currentLineHeight === h && 'bg-muted font-medium')}
            >
              {h}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetLineHeight().run()}>
            Default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Paragraph spacing (gap after the paragraph) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Paragraph spacing (space between paragraphs)"
            aria-label="Paragraph spacing"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground transition-colors hover:bg-muted"
          >
            <Pilcrow className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[7rem]">
          {PARAGRAPH_SPACINGS.map((s) => (
            <DropdownMenuItem
              key={s.value}
              onSelect={() => editor.chain().focus().setParagraphSpacing(s.value).run()}
              className={cn(currentSpacing === s.value && 'bg-muted font-medium')}
            >
              {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetParagraphSpacing().run()}>
            Default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolbarButton title="Add link" onClick={setLink} active={editor.isActive('link')}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')}>
        <Link2Off className="h-4 w-4" />
      </ToolbarButton>

      {/* Text color */}
      <ColorPalette
        value={currentColor}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />

      {onImageUpload && (
        <>
          <Divider />
          <ToolbarButton title="Insert image" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Word-style rich-text editor with visual blocks, producing HTML.
 * Used for creating forum posts, blog posts and announcements.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  dir = 'ltr',
  onImageUpload,
}: RichTextEditorProps) {
  const { toast } = useToast();

  // Upload an image file (from paste/drop) and insert it at the current selection.
  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!onImageUpload || !file.type.startsWith('image/')) return;
      try {
        const url = await onImageUpload(file);
        editor?.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error('Error uploading pasted image:', error);
        toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload the image.' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onImageUpload, toast]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
      ResizableImage.configure({ inline: true, HTMLAttributes: { class: 'rounded-md' } }),
      LineHeight.configure({ heights: LINE_HEIGHTS }),
      ParagraphSpacing.configure({ spacings: PARAGRAPH_SPACINGS.map((s) => s.value) }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize.configure({ sizes: FONT_SIZES }),
      FontFamily.configure({ families: FONT_FAMILIES.map((f) => f.value) }),
      Color,
      Placeholder.configure({ placeholder: placeholder || 'Write your content...' }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        dir,
        class: 'rte-content prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none prose-h1:text-[1.5em] prose-h2:text-[1.25em] prose-h3:text-[1.1em] prose-h1:font-bold prose-h2:font-bold prose-h3:font-bold',
      },
      // Paste images directly with Ctrl/Cmd+V.
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false;
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => void uploadAndInsertImage(file));
        return true;
      },
      // Also support drag-and-drop of image files.
      handleDrop: (_view, event) => {
        if (!onImageUpload) return false;
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => void uploadAndInsertImage(file));
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editability in sync.
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Sync external resets (e.g. after submit) without disrupting active typing.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(incoming, false);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      <Toolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
