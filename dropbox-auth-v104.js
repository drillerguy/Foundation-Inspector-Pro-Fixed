/* FieldVerify Pro guided Dropbox PKCE auth v10.4.1 */
(() => {
  'use strict';
  const APP='fieldverifyDropboxAppKey',TOK='fieldverifyDropboxAccessToken',EXP='fieldverifyDropboxTokenExpires',VER='fieldverifyDropboxPkceVerifier',STA='fieldverifyDropboxOauthState';
  const redirectUri=()=>location.origin+location.pathname;
  const b64url=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const random=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)};
  async function challenge(v){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))))}
  function token(){const t=localStorage.getItem(TOK)||'',e=Number(localStorage.getItem(EXP)||0);return t&&Date.now()<e-60000?t:''}
  function clear(){localStorage.removeItem(TOK);localStorage.removeItem(EXP)}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function setupKey(){return new Promise(resolve=>{
    const old=document.getElementById('dropboxSetupGuide');if(old)old.remove();
    const uri=redirectUri(),wrap=document.createElement('div');wrap.id='dropboxSetupGuide';wrap.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px';
    wrap.innerHTML=`<div style="background:#fff;color:#172033;width:min(560px,100%);max-height:90vh;overflow:auto;border-radius:18px;padding:22px;font:16px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><h2 style="margin:0 0 8px">Connect Dropbox — one time only</h2><p style="margin:0 0 16px">FieldVerify will remember this setup on this device. You only do these steps once.</p><ol style="padding-left:22px;line-height:1.5"><li>Tap <b>Open Dropbox Setup</b>.</li><li>In Dropbox, create an app using <b>Scoped access</b> and <b>App folder</b>.</li><li>Under Permissions turn on <b>files.content.write</b>, <b>sharing.write</b>, and <b>sharing.read</b>.</li><li>Add this exact Redirect URI:<div style="word-break:break-all;background:#f1f3f6;padding:10px;border-radius:8px;margin:6px 0">${esc(uri)}</div></li><li>Copy the <b>App key</b> from Dropbox and paste it below.</li></ol><button id="dbOpenConsole" style="width:100%;padding:13px;margin:5px 0;border:0;border-radius:10px;background:#06f;color:#fff;font-weight:700">OPEN DROPBOX SETUP</button><button id="dbCopyRedirect" style="width:100%;padding:12px;margin:5px 0;border:1px solid #ccd3df;border-radius:10px;background:#fff;font-weight:700">COPY REDIRECT URI</button><input id="dbKeyInput" autocomplete="off" autocapitalize="off" placeholder="Paste Dropbox App key here" style="box-sizing:border-box;width:100%;padding:13px;margin:12px 0 6px;border:1px solid #aab4c4;border-radius:10px;font-size:16px"><button id="dbContinue" style="width:100%;padding:13px;margin:5px 0;border:0;border-radius:10px;background:#162033;color:#fff;font-weight:700">CONNECT DROPBOX</button><button id="dbCancel" style="width:100%;padding:11px;margin-top:5px;border:0;background:transparent">Cancel</button></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#dbOpenConsole').onclick=()=>window.open('https://www.dropbox.com/developers/apps/create','_blank');
    wrap.querySelector('#dbCopyRedirect').onclick=async()=>{try{await navigator.clipboard.writeText(uri);toast('Redirect URI copied')}catch{prompt('Copy this Redirect URI:',uri)}};
    wrap.querySelector('#dbContinue').onclick=()=>{const k=wrap.querySelector('#dbKeyInput').value.trim();if(!k){toast('Paste the Dropbox App key first');return}localStorage.setItem(APP,k);wrap.remove();resolve(k)};
    wrap.querySelector('#dbCancel').onclick=()=>{wrap.remove();resolve('')};
  })}
  async function connect(){
    let key=(localStorage.getItem(APP)||'').trim();if(!key)key=await setupKey();if(!key)return false;
    const verifier=random(64),state=random(24);sessionStorage.setItem(VER,verifier);sessionStorage.setItem(STA,state);
    const u=new URL('https://www.dropbox.com/oauth2/authorize');u.searchParams.set('client_id',key);u.searchParams.set('response_type','code');u.searchParams.set('redirect_uri',redirectUri());u.searchParams.set('code_challenge',await challenge(verifier));u.searchParams.set('code_challenge_method','S256');u.searchParams.set('state',state);u.searchParams.set('token_access_type','online');location.href=u.toString();return true;
  }
  async function finish(){const q=new URLSearchParams(location.search),code=q.get('code');if(!code)return false;const state=q.get('state'),expected=sessionStorage.getItem(STA),verifier=sessionStorage.getItem(VER),key=localStorage.getItem(APP)||'';if(!expected||state!==expected||!verifier||!key)return false;
    const body=new URLSearchParams({code,grant_type:'authorization_code',client_id:key,redirect_uri:redirectUri(),code_verifier:verifier});const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)throw Error(`Dropbox authorization ${r.status}`);const j=await r.json();localStorage.setItem(TOK,j.access_token);localStorage.setItem(EXP,String(Date.now()+(Number(j.expires_in)||14400)*1000));sessionStorage.removeItem(VER);sessionStorage.removeItem(STA);history.replaceState({},document.title,redirectUri());return true;
  }
  window.FIELDVERIFY_DROPBOX_AUTH={token,connect,finish,clear,redirectUri:redirectUri(),setupKey};
})();