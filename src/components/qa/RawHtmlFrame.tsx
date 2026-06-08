import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders an admin-uploaded, self-contained HTML document verbatim inside a
 * sandboxed iframe — so the page IS the uploaded HTML, with its full design.
 *
 * Security: `sandbox="allow-same-origin"` WITHOUT `allow-scripts` means no
 * JavaScript in the document runs (scripts and inline handlers are inert), so
 * there is no XSS surface. `allow-same-origin` lets us read the rendered
 * document to auto-size the iframe to its content height (no inner scrollbar).
 */
export function RawHtmlFrame({ html, title }: { html: string; title?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc?.body) return;
        const h = Math.max(
          doc.body.scrollHeight,
          doc.documentElement?.scrollHeight ?? 0
        );
        if (h > 0) setHeight(h);
      } catch {
        // contentDocument unreadable — keep the current height.
      }
    };

    iframe.addEventListener('load', measure);
    // Re-measure on viewport resize (responsive documents reflow).
    window.addEventListener('resize', measure);
    // Late content (e.g. images) can change height after load.
    const t = window.setTimeout(measure, 300);
    measure();

    return () => {
      iframe.removeEventListener('load', measure);
      window.removeEventListener('resize', measure);
      window.clearTimeout(t);
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title={title || 'FAQ content'}
      srcDoc={html}
      sandbox="allow-same-origin"
      className="w-full border-0 block"
      style={{ height }}
    />
  );
}

export default RawHtmlFrame;
