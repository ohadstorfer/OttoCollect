import { useEffect } from 'react';

const PerformanceMonitor = () => {
  useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // This would be used with web-vitals library if installed
      console.log('Performance monitoring enabled');
    }

    // Monitor LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      return () => observer.disconnect();
    }
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
