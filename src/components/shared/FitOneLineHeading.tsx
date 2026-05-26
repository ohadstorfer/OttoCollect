import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a heading on a single line, shrinking the font size when the text
 * is too long to fit the available container width.
 */
export const FitOneLineHeading: React.FC<{
  text: string;
  className?: string;
  maxSizePx?: number;
  minSizePx?: number;
}> = ({ text, className, maxSizePx = 20, minSizePx = 10 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxSizePx);

  useEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;

      const availableWidth = container.clientWidth;
      if (availableWidth === 0) return;

      measure.style.fontSize = `${maxSizePx}px`;
      const naturalWidth = measure.scrollWidth;

      if (naturalWidth <= availableWidth) {
        setFontSize(maxSizePx);
        return;
      }

      const ratio = availableWidth / naturalWidth;
      const newSize = Math.max(minSizePx, Math.floor(maxSizePx * ratio));
      setFontSize(newSize);
    };

    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [text, maxSizePx, minSizePx]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden relative">
      <h2
        className={cn('font-bold whitespace-nowrap', className)}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
      >
        <span>{text}</span>
      </h2>
      <span
        ref={measureRef}
        aria-hidden
        className={cn('font-bold whitespace-nowrap absolute invisible pointer-events-none', className)}
        style={{ left: 0, top: 0, fontSize: `${maxSizePx}px` }}
      >
        {text}
      </span>
    </div>
  );
};
