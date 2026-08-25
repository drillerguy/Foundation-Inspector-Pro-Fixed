/* Legacy service-worker compatibility shim.
   Older installs may still be registered to sw.js. Keep this file so those
   installs automatically run the exact same worker code as the current app
   instead of fighting service-worker.js for control of the same scope.

   IMPORTANT: bump this query version with every release so legacy installs
   are forced to fetch the newest worker instead of staying on an old import.
*/
importScripts('./service-worker.js?v=10.24-project-delete-1');
