import DOMPurify from 'dompurify';

/**
 * Helpers for working with rich-text (HTML) post content.
 *
 * Posts created with the rich-text editor store HTML in their `content` field.
 * Older posts store plain text. These helpers let us tell the two apart, render
 * HTML safely, and derive plain-text previews/excerpts from either format.
 */

// Tags that indicate the string is HTML produced by the editor rather than
// plain text that merely happens to contain an angle bracket.
const HTML_TAG_REGEX =
  /<\/?(p|div|br|h[1-6]|ul|ol|li|blockquote|hr|img|a|strong|em|b|i|u|s|span|figure|pre|code|table)\b[^>]*>/i;

/** True when the content looks like editor-produced HTML. */
export function isLikelyHtml(content: string | null | undefined): boolean {
  if (!content) return false;
  return HTML_TAG_REGEX.test(content);
}

// Force links to open in a new tab safely. Registered once at module load.
let hookRegistered = false;
function ensureLinkHook() {
  if (hookRegistered) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hookRegistered = true;
}

/** Sanitize editor HTML for safe rendering via dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  ensureLinkHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'hr', 'pre', 'code',
      'strong', 'em', 'b', 'i', 'u', 's',
      'a', 'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class', 'width', 'height', 'data-align'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Convert content (HTML or plain text) to plain text, e.g. for list previews,
 * excerpts and meta descriptions. Whitespace is collapsed to single spaces.
 */
export function htmlToPlainText(content: string | null | undefined): string {
  if (!content) return '';
  if (!isLikelyHtml(content)) return content;

  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = sanitizeHtml(content);
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  // SSR / no-DOM fallback: strip tags crudely.
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when content has no meaningful payload: no text and no embedded image.
 * Handles the editor's empty value (`<p></p>`) as well as plain empty strings.
 */
export function isContentEmpty(content: string | null | undefined): boolean {
  if (!content) return true;
  if (/<img\b/i.test(content)) return false;
  return htmlToPlainText(content).trim().length === 0;
}

/** Returns the `src` of the first <img> in the content, or null if none. */
export function getFirstImageSrc(content: string | null | undefined): string | null {
  if (!content) return null;
  const match = content.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/** Plain-text excerpt of at most `max` characters (default 150), with ellipsis. */
export function buildExcerpt(content: string | null | undefined, max = 150): string {
  const text = htmlToPlainText(content);
  return text.length > max ? `${text.substring(0, max)}...` : text;
}
