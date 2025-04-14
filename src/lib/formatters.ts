
/**
 * Formatters utility functions for the application
 */

/**
 * Format a number as currency
 * @param value Number to format
 * @param currency Currency code (default: 'USD')
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
};

/**
 * Format a date string or timestamp
 * @param date Date to format
 * @param options Format options
 */
export const formatDate = (date: string | number | Date, options: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

/**
 * Format a number with commas
 * @param value Number to format
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};
