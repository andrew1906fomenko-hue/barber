export async function register() {
  // Keep instrumentation free of app server modules: Next compiles this file for
  // multiple runtimes, and the local DB uses Node built-ins such as crypto/fs.
}
