const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
if ('serviceWorker' in navigator && !isNativeApp) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
