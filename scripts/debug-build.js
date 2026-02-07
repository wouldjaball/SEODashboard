console.log('Node Version:', process.version);
console.log('NPM Version:', process.env.npm_config_user_agent);
console.log('Current Directory:', process.cwd());

const { execSync } = require('child_process');

function runBuildDiagnostics() {
  try {
    console.log('🔍 Running Build Diagnostics...');
    
    // Log package.json content
    const packageJson = require('./package.json');
    console.log('📦 Package Scripts:', JSON.stringify(packageJson.scripts, null, 2));
    
    // List installed dependencies
    console.log('📋 Installed Dependencies:');
    execSync('npm list --depth=1', { stdio: 'inherit' });
    
    // Try running TypeScript check
    console.log('🕵️ Running TypeScript Check...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    
    // Attempt Next.js build
    console.log('🏗️ Attempting Next.js Build...');
    execSync('npx next build', { stdio: 'inherit' });
    
    console.log('✅ Build Process Completed Successfully');
  } catch (error) {
    console.error('❌ Build Diagnostics Failed:', error.message);
    process.exit(1);
  }
}

runBuildDiagnostics();