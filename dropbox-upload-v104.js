/* FieldVerify Pro Dropbox upload/share helper v10.4.0 */
(() => {
  'use strict';
  const SIMPLE_LIMIT=140*1024*1024,CHUNK=8*1024*1024;
  const auth=()=>window.FIELDVERIFY_DROPBOX_AUTH;
  async function content(endpoint,arg,body){const t=auth()?.token();if(!t)throw Error('DROPBOX_RECONNECT');const r=await fetch(`https://content.dropboxapi.com/2/${endpoint}`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify(arg)},body});if(r.status===401){auth()?.clear();throw Error('DROPBOX_RECONNECT')}if(!r.ok)throw Error(`Dropbox upload ${r.status}: ${await r.text()}`);return r.json()}
  async function simple(file,path){return content('files/upload',{path,mode:'overwrite',autorename:false,mute:false,strict_conflict:false},file)}
  async function session(file,path){let offset=0;const start=await content('files/upload_session/start',{close:false},new Blob([])),sid=start.session_id;while(file.size-offset>CHUNK){const end=Math.min(offset+CHUNK,file.size);toast(`Uploading to Dropbox: ${Math.round(end/file.size*100)}%`);await content('files/upload_session/append_v2',{cursor:{session_id:sid,offset},close:false},file.slice(offset,end));offset=end}return content('files/upload_session/finish',{cursor:{session_id:sid,offset},commit:{path,mode:'overwrite',autorename:false,mute:false,strict_conflict:false}},file.slice(offset))}
  async function upload(file,path){toast(`Uploading ${(file.size/1048576).toFixed(1)} MB to Dropbox…`);await(file.size<=SIMPLE_LIMIT?simple(file,path):session(file,path));return path}
  async function api(endpoint,arg){const t=auth()?.token();if(!t)throw Error('DROPBOX_RECONNECT');const r=await fetch(`https://api.dropboxapi.com/2/${endpoint}`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(arg)});if(r.status===401){auth()?.clear();throw Error('DROPBOX_RECONNECT')}if(!r.ok){const e=Error(`Dropbox ${endpoint} ${r.status}`);e.status=r.status;e.body=await r.text();throw e}return r.json()}
  async function link(path){try{return(await api('sharing/create_shared_link_with_settings',{path,settings:{requested_visibility:'public'}})).url}catch(e){if(e.status!==409)throw e;const j=await api('sharing/list_shared_links',{path,direct_only:true});if(j.links?.[0]?.url)return j.links[0].url;throw e}}
  window.FIELDVERIFY_DROPBOX_IO={upload,link};
})();
