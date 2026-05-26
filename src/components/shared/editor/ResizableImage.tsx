import React, { useRef } from 'react';
import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MIN_WIDTH = 40; // px
// Cap the height of freshly inserted images so large/tall photos don't dominate.
// Applies only while no explicit width is set — resizing overrides it.
const MAX_INITIAL_HEIGHT = 400; // px

/**
 * React node view: renders the image inline (so images can sit side by side and
 * flow with text) with a resize handle. Left/center/right buttons align the
 * parent paragraph, which positions the whole line of images.
 */
function ResizableImageComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title } = node.attrs;
  const width = node.attrs.width as string | null;
  const containerRef = useRef<HTMLSpanElement>(null);
  const editable = editor.isEditable;

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = containerRef.current?.offsetWidth ?? MIN_WIDTH;

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(MIN_WIDTH, Math.round(startWidth + (ev.clientX - startX)));
      updateAttributes({ width: `${next}px` });
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  return (
    <NodeViewWrapper as="span" className="rt-image-node mr-1 inline-block align-middle">
      <span
        ref={containerRef}
        className={cn(
          'relative inline-block max-w-full align-middle',
          selected && 'outline outline-2 outline-primary outline-offset-2 rounded-sm'
        )}
        style={{ width: width || 'auto' }}
      >
        <img
          src={src}
          alt={alt || ''}
          title={title || ''}
          draggable={false}
          className={cn(
            'block rounded-md m-0',
            width ? 'h-auto w-full' : 'h-auto w-auto max-w-full'
          )}
          style={width ? undefined : { maxHeight: MAX_INITIAL_HEIGHT }}
        />

        {editable && selected && (
          <>
            {/* Alignment toolbar — aligns the parent line/paragraph. */}
            <span
              className="absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-md"
              contentEditable={false}
            >
              {([
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const).map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  title={`Align ${value}`}
                  aria-label={`Align ${value}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().setTextAlign(value).run()}
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted',
                    editor.isActive({ textAlign: value }) && 'bg-muted text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </span>

            {/* Resize handle (bottom-right corner) */}
            <span
              onPointerDown={startResize}
              contentEditable={false}
              className="absolute -bottom-1.5 -right-1.5 z-10 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-background"
            />
          </>
        )}
      </span>
    </NodeViewWrapper>
  );
}

/**
 * Inline image extension: images flow with text and can be placed side by side
 * on the same line. Resizable (persisted as a `width` inline style). Horizontal
 * positioning is handled by the parent paragraph's text-align.
 */
export const ResizableImage = Image.extend({
  inline: true,
  group: 'inline',
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute('width') || null,
        renderHTML: (attributes) =>
          attributes.width
            ? { style: `width: ${attributes.width}; height: auto; vertical-align: middle` }
            : { style: `max-height: ${MAX_INITIAL_HEIGHT}px; max-width: 100%; vertical-align: middle` },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

export default ResizableImage;
