import React from 'react';
import { useTheme } from '@/context/ThemeContext';

interface CountrySelectionHeaderProps {
  title?: string;
  description?: string;
}

const CountrySelectionHeader: React.FC<CountrySelectionHeaderProps> = ({
  title = "Select a Country",
  description = "Choose a country to view banknotes from your collection."
}) => {
  const { theme } = useTheme();

  return (
    <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden`}>
      <div className="absolute inset-0 -z-10">
        <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${
          theme === 'light'
            ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
            : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
        } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${
          theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'
        } fade-bottom`}>
          <span>{title}</span>
        </h1>
        <p className={`mt-4 text-center ${
          theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'
        } max-w-2xl mx-auto fade-bottom`}>
          {description}
        </p>
      </div>
    </section>
  );
};

export default CountrySelectionHeader;
