import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

const ChevronDown = () => (
  <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
);

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleOptionChange = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options.filter(opt => selected.includes(opt.value)).map(opt => opt.label);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleBlur = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 flex items-center justify-between transition-colors"
        onClick={handleToggle}
        tabIndex={0}
      >
        <span className="truncate text-sm font-medium text-gray-800">
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : (placeholder || 'Select...')}
        </span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1 animate-fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No available options...</div>
          ) : (
            options.map((option) => (
              <label key={option.value} className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => handleOptionChange(option.value)}
                  className="mr-2 accent-primary-600 rounded"
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect; 