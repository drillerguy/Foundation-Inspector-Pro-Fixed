(()=>{
'use strict';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const RESET_URL='https://drillerguy.github.io/Foundation-Inspector-Pro-Fixed/password-reset.html';
let busy=false,lastSent=0;
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
async function sendReset(){
 if(busy)return;
 const email=document.getElementById('fvEmail')?.value.trim();
 const body=document.getElementById('fvCloudBody');
 if(!email){if(body){let n=document.getElementById('fvResetMsg');if(!n){n=document.createElement('p');n.id='fvResetMsg';body.appendChild(n)}n.textContent='Enter your email above first.'}return}
 if(Date.now()-lastSent<60000)return;
 busy=true;const btn=document.getElementById('fvResetPassword');if(btn){btn.disabled=true;btn.textContent='Sending reset email…'}
 try{
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const r=await client.auth.resetPasswordForEmail(email,{redirectTo:RESET_URL});
  if(r.error)throw r.error;
  lastSent=Date.now();
  let n=document.getElementById('fvResetMsg');if(!n&&body){n=document.createElement('p');n.id='fvResetMsg';body.appendChild(n)}
  if(n)n.innerHTML='<b>Reset email sent.</b> Open the newest FieldVerify email and tap its link. It will open a page where you choose a new password.';
  if(btn)btn.textContent='Reset email sent';
 }catch(e){
  let n=document.getElementById('fvResetMsg');if(!n&&body){n=document.createElement('p');n.id='fvResetMsg';body.appendChild(n)}
  const msg=String(e?.message||e);
  if(n)n.innerHTML=msg.toLowerCase().includes('rate')?'<b>Email limit reached.</b> Do not keep pressing reset. Wait for the Supabase email limit to clear, then request one new email.':'<b>Password reset failed:</b> '+esc(msg);
  if(btn){btn.disabled=false;btn.textContent='Forgot / reset password'}
 }finally{busy=false}
}
function add(){
 const body=document.getElementById('fvCloudBody');
 if(!body||!document.getElementById('fvEmail')||document.getElementById('fvResetPassword'))return;
 const b=document.createElement('button');b.id='fvResetPassword';b.type='button';b.textContent='Forgot / reset password';b.style.cssText='width:100%;padding:13px;margin:6px 0;background:#687480;color:#fff;border:0;border-radius:11px;font-weight:900';b.onclick=sendReset;
 const signUp=document.getElementById('fvSignUp');if(signUp)signUp.insertAdjacentElement('afterend',b);else body.appendChild(b);
 const p=document.createElement('p');p.id='fvResetMsg';p.className='tiny';p.textContent='This resets only your FieldVerify Cloud password — not your Supabase dashboard password.';b.insertAdjacentElement('afterend',p);
}
const obs=new MutationObserver(add);
function start(){add();obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(add,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();