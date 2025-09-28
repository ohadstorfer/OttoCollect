import { useEffect } from 'react';

export const usePerformanceOptimization = () => {
  useEffect(() => {
    // Preload critical images
    const preloadImages = [
      '/OttoCollectIcon.PNG',
      '/favicon.PNG',
      '/favicon-96x96.png',
      '/web-app-manifest-192x192.png',
      '/apple-touch-icon.png'
    ];

    preloadImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (src === '/OttoCollectIcon.PNG') {
        link.setAttribute('fetchpriority', 'high');
      }
      document.head.appendChild(link);
    });

    // Optimize font loading
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    fontLink.as = 'style';
    document.head.appendChild(fontLink);

    // Add resource hints for better performance
    const resourceHints = [
      { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com' }
    ];

    resourceHints.forEach(hint => {
      const link = document.createElement('link');
      link.rel = hint.rel;
      link.href = hint.href;
      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      // Remove any dynamically added elements if needed
    };
  }, []);
};

export default usePerformanceOptimization;
