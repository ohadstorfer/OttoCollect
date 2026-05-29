import { Extension } from '@tiptap/core';

export interface FontFamilyOptions {
  /** Mark types the font-family attribute applies to. */
  types: string[];
  /** Selectable font-family stacks (CSS values, e.g. "Arial, sans-serif"). */
  families: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (family: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

/**
 * Adds a `fontFamily` attribute (rendered as inline `font-family`) to the
 * `textStyle` mark, mirroring {@link ./FontSize}. Lets the user pick a font
 * family for the selected text — kept intentionally small (a handful of
 * Word-like stacks) rather than exposing the full system font list.
 */
export const FontFamily = Extension.create<FontFamilyOptions>({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
      families: [],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            // Preserve quotes on multi-word names like "Times New Roman" —
            // stripping them produces invalid CSS on the next render.
            parseHTML: (element) => element.style.fontFamily || null,
            renderHTML: (attributes) =>
              attributes.fontFamily ? { style: `font-family: ${attributes.fontFamily}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (family: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontFamily: family }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

export default FontFamily;
