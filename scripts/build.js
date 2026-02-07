const { spawn } = require('child_process');
const { execSync } = require('child_process');

// Suppress console warnings during build
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('width(-1) and height(-1) of chart') ||
     msg.includes('The width(-1) and height(-1)'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

try {
  // Run build diagnostics
  execSync('node ./scripts/build-debug.js', { stdio: 'inherit' });

  const build = spawn('npx', ['next', 'build'], {
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: true
  });

  build.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('width(-1) and height(-1)')) {
      process.stderr.write(data);
    }
  });

  build.on('close', (code) => {
    process.exit(code);
  });
} catch (error) {
  console.error('Build diagnostics failed:', error);
  process.exit(1);
}
