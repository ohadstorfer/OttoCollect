
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    // Always show the first page
    pages.push(
      <Button
        key={1}
        variant={currentPage === 1 ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        1
      </Button>
    );
    
    // Calculate range of pages to show
    let startPage = Math.max(2, currentPage - Math.floor((maxVisiblePages - 3) / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 4);
    
    if (endPage - startPage < maxVisiblePages - 4) {
      startPage = Math.max(2, endPage - (maxVisiblePages - 4));
    }
    
    // Show ellipsis after first page if needed
    if (startPage > 2) {
      pages.push(
        <Button key="start-ellipsis" variant="outline" size="sm" disabled>
          ...
        </Button>
      );
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    // Show ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push(
        <Button key="end-ellipsis" variant="outline" size="sm" disabled>
          ...
        </Button>
      );
    }
    
    // Always show the last page if there's more than one page
    if (totalPages > 1) {
      pages.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          {totalPages}
        </Button>
      );
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center space-x-1">
        {renderPageNumbers()}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
