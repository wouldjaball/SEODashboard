export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress Recharts SSR warnings during build
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const msg = args[0];
      if (
        typeof msg === 'string' &&
        (msg.includes('width(-1) and height(-1) of chart') ||
         msg.includes('The width(-1) and height(-1)'))
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }
}
