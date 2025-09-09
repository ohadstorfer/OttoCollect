#!/usr/bin/env node

/**
 * Asset optimization script
 * This script helps optimize images and other assets for better performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting asset optimization...');

// Check if dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.log('❌ Dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// List of optimizations to perform
const optimizations = [
  {
    name: 'Check for large assets',
    check: () => {
      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const largeFiles = files.filter(file => {
          const filePath = path.join(assetsDir, file);
          const stats = fs.statSync(filePath);
          return stats.size > 500000; // 500KB
        });
        
        if (largeFiles.length > 0) {
          console.log('⚠️  Large files detected:', largeFiles);
          return false;
        }
      }
      return true;
    }
  },
  {
    name: 'Verify favicon files',
    check: () => {
      const faviconFiles = [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-96x96.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'apple-touch-icon.png'
      ];
      
      const missingFiles = faviconFiles.filter(file => 
        !fs.existsSync(path.join(distDir, file))
      );
      
      if (missingFiles.length > 0) {
        console.log('⚠️  Missing favicon files:', missingFiles);
        return false;
      }
      return true;
    }
  }
];

// Run optimizations
let allPassed = true;
optimizations.forEach(opt => {
  const passed = opt.check();
  if (passed) {
    console.log(`✅ ${opt.name}`);
  } else {
    console.log(`❌ ${opt.name}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('🎉 All optimizations passed!');
} else {
  console.log('⚠️  Some optimizations failed. Please check the warnings above.');
}

console.log('✨ Asset optimization complete!');
