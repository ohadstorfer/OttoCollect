// Script to generate static HTML files with proper canonical URLs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting static site generation...');

// Step 1: Generate routes configuration
console.log('📝 Generating routes configuration...');
try {
  execSync('node scripts/prerender-config.js', { stdio: 'inherit' });
  console.log('✅ Routes configuration generated');
} catch (error) {
  console.error('❌ Failed to generate routes:', error.message);
  process.exit(1);
}

// Step 2: Build the project with pre-rendering
console.log('🔨 Building project with pre-rendering...');
try {
  execSync('vite build --mode production', { stdio: 'inherit' });
  console.log('✅ Project built successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify generated files
console.log('🔍 Verifying generated files...');
const distDir = path.join(__dirname, '../dist');
const expectedFiles = [
  'index.html',
  'catalog/index.html',
  'catalog/Ottoman%20Empire/index.html',
  'catalog/Turkish%20Republic/index.html',
  'marketplace/index.html',
  'forum/index.html',
  'blog/index.html'
];

let allFilesExist = true;
expectedFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} generated`);
    
    // Check if canonical URL is present
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('rel="canonical"')) {
      console.log(`  📌 Canonical URL found in ${file}`);
    } else {
      console.log(`  ⚠️  No canonical URL found in ${file}`);
    }
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('🎉 Static site generation completed successfully!');
  console.log('📁 Generated files are in the dist/ directory');
  console.log('🌐 You can now serve these files with any static hosting service');
} else {
  console.log('⚠️  Some files are missing, but generation completed');
}

console.log('\n📋 Next steps:');
console.log('1. Test the generated files: npm run preview:static');
console.log('2. Deploy to your hosting service');
console.log('3. Verify canonical URLs in "View Page Source"');
