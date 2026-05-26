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
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Link2Off, Image as ImageIcon, Loader2,
  Undo2, Redo2, AlignVerticalSpaceAround, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LINE_HEIGHTS = ['0.5', '0.75', '1', '1.15', '1.5', '2', '2.5', '3'];

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

      <ToolbarButton title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

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

      {/* Line height */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Line spacing"
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
      <label
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
        title="Text color"
      >
        <span
          className="h-4 w-4 rounded-sm border"
          style={{ backgroundColor: (editor.getAttributes('textStyle').color as string) || '#000000' }}
        />
        <input
          type="color"
          className="sr-only"
          value={(editor.getAttributes('textStyle').color as string) || '#000000'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>

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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder || 'Write your content...' }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        dir,
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none prose-h1:text-[1.5em] prose-h2:text-[1.25em] prose-h3:text-[1.1em] prose-h1:font-bold prose-h2:font-bold prose-h3:font-bold',
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
