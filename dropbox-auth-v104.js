/* FieldVerify Pro Dropbox PKCE auth v10.4.0 */
(() => {
  'use strict';
  const APP='fieldverifyDropboxAppKey',TOK='fieldverifyDropboxAccessToken',EXP='fieldverifyDropboxTokenExpires',VER='fieldverifyDropboxPkceVerifier',STA='fieldverifyDropboxOauthState';
  const redirectUri=()=>location.origin+location.pathname;
  const b64url=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const random=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)};
  async function challenge(v){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))))}
  function token(){const t=localStorage.getItem(TOK)||'',e=Number(localStorage.getItem(EXP)||0);return t&&Date.now()<e-60000?t:''}
  function clear(){localStorage.removeItem(TOK);localStorage.removeItem(EXP)}
  async function connect(){
    let key=(localStorage.getItem(APP)||'').trim();
    if(!key){key=(prompt(`Paste your Dropbox App Key.\n\nAdd this Redirect URI in Dropbox App Console:\n${redirectUri()}`)||'').trim();if(!key)return false;localStorage.setItem(APP,key)}
    const verifier=random(64),state=random(24);sessionStorage.setItem(VER,verifier);sessionStorage.setItem(STA,state);
    const u=new URL('https://www.dropbox.com/oauth2/authorize');u.searchParams.set('client_id',key);u.searchParams.set('response_type','code');u.searchParams.set('redirect_uri',redirectUri());u.searchParams.set('code_challenge',await challenge(verifier));u.searchParams.set('code_challenge_method','S256');u.searchParams.set('state',state);u.searchParams.set('token_access_type','online');location.href=u.toString();return true;
  }
  async function finish(){const q=new URLSearchParams(location.search),code=q.get('code');if(!code)return false;const state=q.get('state'),expected=sessionStorage.getItem(STA),verifier=sessionStorage.getItem(VER),key=localStorage.getItem(APP)||'';if(!expected||state!==expected||!verifier||!key)return false;
    const body=new URLSearchParams({code,grant_type:'authorization_code',client_id:key,redirect_uri:redirectUri(),code_verifier:verifier});const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)throw Error(`Dropbox authorization ${r.status}`);const j=await r.json();localStorage.setItem(TOK,j.access_token);localStorage.setItem(EXP,String(Date.now()+(Number(j.expires_in)||14400)*1000));sessionStorage.removeItem(VER);sessionStorage.removeItem(STA);history.replaceState({},document.title,redirectUri());return true;
  }
  window.FIELDVERIFY_DROPBOX_AUTH={token,connect,finish,clear,redirectUri:redirectUri()};
})();
