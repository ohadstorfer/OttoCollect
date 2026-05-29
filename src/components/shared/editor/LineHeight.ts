import { Extension } from '@tiptap/core';

export interface LineHeightOptions {
  /** Node types the line-height attribute applies to. */
  types: string[];
  /** Selectable line-height values. */
  heights: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (height: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

/**
 * Adds a `lineHeight` attribute (rendered as inline `line-height`) to block
 * nodes, plus `setLineHeight` / `unsetLineHeight` commands. Not part of
 * StarterKit, so it lives as its own extension.
 */
export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      heights: ['0.5', '0.75', '1', '1.15', '1.5', '2', '2.5', '3'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            // null (not '1') so untouched paragraphs inherit the editor's CSS
            // line-height — otherwise every paragraph got `style="line-height:1"`
            // inline, which is *tighter* than Word's default of ~1.15 and made
            // the editor feel cramped regardless of CSS.
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (height: string) =>
        ({ commands }) =>
          this.options.types.every((type) => commands.updateAttributes(type, { lineHeight: height })),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type) => commands.resetAttributes(type, 'lineHeight')),
    };
  },
});

export default LineHeight;
