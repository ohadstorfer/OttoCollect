import React from 'react';
import { cn } from '@/lib/utils';
import { isLikelyHtml, sanitizeHtml } from '@/lib/htmlContent';

interface RichTextContentProps {
  /** Post content: editor HTML for new posts, plain text for legacy posts. */
  content: string | null | undefined;
  /** Extra classes applied to the wrapping element. */
  className?: string;
}

// Legacy plain-text rendering: detect bare URLs and render them as links.
const urlRegex = /(https?:\/\/[^\s]+)/g;
function renderTextWithLinks(text: string) {
  return text.split(urlRegex).map((part, index) =>
    part.match(urlRegex) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline break-all"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}

/**
 * Renders forum/blog/announcement post content.
 *
 * - New posts (rich-text editor) store HTML, which is sanitized and rendered
 *   with `prose` typography styles.
 * - Legacy posts store plain text, which is rendered with preserved whitespace
 *   and auto-linked URLs (matching the previous behaviour).
 */
export function RichTextContent({ content, className }: RichTextContentProps) {
  const value = content || '';

  if (isLikelyHtml(value)) {
    return (
      <div
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none break-words prose-h1:text-[1.5em] prose-h2:text-[1.25em] prose-h3:text-[1.1em] prose-h1:font-bold prose-h2:font-bold prose-h3:font-bold prose-img:inline-block prose-img:align-middle prose-img:my-0 prose-img:mr-1',
          className
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
      />
    );
  }

  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      {renderTextWithLinks(value)}
    </div>
  );
}

export default RichTextContent;
