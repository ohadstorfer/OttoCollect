import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { cn } from '@/lib/utils';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  className?: string;
  overscan?: number;
}

function VirtualizedGrid<T>({
  items,
  renderItem,
  itemWidth,
  itemHeight,
  gap = 16,
  className,
  overscan = 5
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 600 });

  // Calculate grid dimensions
  const { columnCount, rowCount } = useMemo(() => {
    const cols = Math.floor((containerSize.width + gap) / (itemWidth + gap)) || 1;
    const rows = Math.ceil(items.length / cols);
    return { columnCount: cols, rowCount: rows };
  }, [containerSize.width, itemWidth, gap, items.length]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setContainerSize(prev => ({ ...prev, width }));
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      handleResize(); // Initial size
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Grid cell renderer
  const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex];

    if (!item) return null;

    return (
      <div
        style={{
          ...style,
          left: (style.left as number) + gap / 2,
          top: (style.top as number) + gap / 2,
          width: (style.width as number) - gap,
          height: (style.height as number) - gap,
        }}
      >
        {renderItem(item, itemIndex)}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {containerSize.width > 0 && (
        <Grid
          columnCount={columnCount}
          rowCount={rowCount}
          columnWidth={itemWidth + gap}
          rowHeight={itemHeight + gap}
          height={Math.min(containerSize.height, rowCount * (itemHeight + gap) + gap)}
          width={containerSize.width}
          overscanRowCount={overscan}
          overscanColumnCount={overscan}
        >
          {Cell}
        </Grid>
      )}
    </div>
  );
}

export default VirtualizedGrid;