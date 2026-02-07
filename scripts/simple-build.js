const { exec } = require('child_process');

console.log('Starting simple build process...');

exec('npx next build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error}`);
    console.error(`stderr: ${stderr}`);
    process.exit(1);
  }
  
  console.log('Build successful!');
  console.log(stdout);
  process.exit(0);
});