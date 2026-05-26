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
            default: '1',
            parseHTML: (element) => element.style.lineHeight || '1',
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
