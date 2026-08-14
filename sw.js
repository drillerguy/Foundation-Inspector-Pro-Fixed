/* Legacy service-worker compatibility shim.
   Older installs may still be registered to sw.js. Keep this file so those
   installs automatically run the exact same worker code as the current app
   instead of fighting service-worker.js for control of the same scope. */
importScripts('./service-worker.js?v=10.16');
