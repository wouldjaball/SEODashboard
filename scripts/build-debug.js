const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTypeCheck() {
  try {
    console.log('🔍 Running TypeScript Type Check...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript Type Check Passed');
    return true;
  } catch (error) {
    console.error('❌ TypeScript Type Check Failed:', error.message);
    return false;
  }
}

function findPotentialIssues(directory) {
  console.log(`🕵️ Scanning ${directory} for potential TypeScript issues...`);
  const issues = [];

  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for 'continue' statements outside of loops
    let inLoop = false;
    let braceCount = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Track loop blocks
      if (trimmedLine.includes('for ') || trimmedLine.includes('while ')) {
        inLoop = true;
        braceCount = 0;
      }
      
      // Count braces to track block scope
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (inLoop && braceCount <= 0) {
        inLoop = false;
      }
      
      // Check for continue outside loops (simplified check)
      if (trimmedLine.startsWith('continue') && !inLoop && !line.includes('for ') && !line.includes('while ')) {
        issues.push(`⚠️ Potential misplaced 'continue' in ${filePath}:${index + 1}`);
      }

      if (line.includes('type Company') && line.includes('| null')) {
        issues.push(`⚠️ Nullable Company type in ${filePath}:${index + 1}`);
      }
    });
  }

  function traverseDirectory(dir) {
    // Skip node_modules and .next directories
    if (dir.includes('node_modules') || dir.includes('.next')) {
      return;
    }

    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        
        try {
          const stat = fs.lstatSync(fullPath);
          
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            traverseDirectory(fullPath);
          } else if (!stat.isSymbolicLink() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            scanFile(fullPath);
          }
        } catch (err) {
          // Skip files that can't be accessed (broken symlinks, etc.)
          console.log(`⚠️ Skipping ${fullPath}: ${err.message}`);
        }
      });
    } catch (err) {
      console.log(`⚠️ Cannot read directory ${dir}: ${err.message}`);
    }
  }

  traverseDirectory(directory);
  return issues;
}

function main() {
  const projectRoot = process.cwd();
  console.log(`🏗️ Debugging Build for SEODashboard at ${projectRoot}`);

  const typeCheckPassed = runTypeCheck();
  const potentialIssues = findPotentialIssues(projectRoot);

  if (potentialIssues.length > 0) {
    console.log('\n🚨 Potential Issues Found:');
    potentialIssues.forEach(issue => console.log(issue));
  }

  if (!typeCheckPassed || potentialIssues.length > 0) {
    process.exit(1);
  }

  console.log('🎉 Build Diagnostics Complete - No Critical Issues Found');
}

main();