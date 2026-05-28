import { Extension } from '@tiptap/core';

export interface ParagraphSpacingOptions {
  /** Block node types the spacing attribute applies to. */
  types: string[];
  /** Selectable spacing values (CSS units, e.g. "1em"). */
  spacings: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

/**
 * Adds a `marginBottom` attribute (rendered as inline `margin-bottom`) to block
 * nodes, controlling the gap *after* a paragraph/heading — i.e. the space
 * between paragraphs. Distinct from line-height, which controls spacing of
 * lines *within* a paragraph (see {@link ../LineHeight}).
 */
export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      spacings: ['0', '0.25em', '0.5em', '0.75em', '1em', '1.5em', '2em'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) =>
              attributes.marginBottom ? { style: `margin-bottom: ${attributes.marginBottom}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ commands }) =>
          this.options.types.every((type) => commands.updateAttributes(type, { marginBottom: spacing })),
      unsetParagraphSpacing:
        () =>
        ({ commands }) =>
          this.options.types.every((type) => commands.resetAttributes(type, 'marginBottom')),
    };
  },
});

export default ParagraphSpacing;
