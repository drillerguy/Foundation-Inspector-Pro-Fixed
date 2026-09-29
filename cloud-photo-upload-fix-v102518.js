/* Transfers are owned by the cloud module; no duplicate upload workers. */
(()=>{
'use strict';
window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX={version:'10.25.90',run:async()=>{
 const cloud=window.FIELDVERIFY_CLOUD_SYNC;if(!cloud)throw Error('Cloud module is still loading');
 await cloud.init();const result=await cloud.uploadPhotos();
 if(result.failed.length||result.missing)throw Error(`${result.failed.length} uploads failed; ${result.missing} photos unavailable on this device`);
 return result.uploaded;
}};
})();
