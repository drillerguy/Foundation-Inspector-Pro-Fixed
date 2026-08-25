/* FieldVerify Pro v10.24 - email invitation helper
   Restores the manager workflow to enter an email address, create a one-use
   project invitation code, and open the device email app with the code ready
   to send. The code is still created by the existing secure Supabase RPC.
*/
(()=>{
'use strict';
const VERSION='10.24-invite-email-1';
let busy=false;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
function projectName(){try{return activeProject()?.name||'FieldVerify project'}catch{return'FieldVerify project'}}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}
function roleLabel(v){return v==='viewer'?'View only':v==='admin'?'Admin':'Worker'}
function emailInvite(email,code,role){
 const subject=`FieldVerify project invitation — ${projectName()}`;
 const body=`You have been invited to the FieldVerify project: ${projectName()}\n\nInvitation code: ${code}\nAccess level: ${roleLabel(role)}\n\nOpen FieldVerify Pro, choose the invited-user sign-up or sign in, and enter this invitation code.\n\nThis is a one-use code and expires in 7 days.`;
 location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function makeAndEmail(){
 if(busy)return;
 const email=document.getElementById('fvInviteEmail')?.value.trim()||'';
 const role=document.getElementById('fvInviteRole')?.value||'member';
 if(!validEmail(email)){alert('Enter the person\'s email address first.');return}
 const base=document.getElementById('fvMakeInvite');
 if(!base){alert('Open Manage Users / Invites again and try once more.');return}
 busy=true;
 const btn=document.getElementById('fvMakeInviteEmail');if(btn){btn.disabled=true;btn.textContent='CREATING INVITE…'}
 try{
  /* Use the same Supabase client that cloud-access already loads indirectly by
     importing a tiny independent client here. No password or secret key is stored. */
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const c=mod.createClient('https://xkjmuvrzlsgftvgvazld.supabase.co','sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let pid=null;try{const p=activeProject();pid=p?.cloudId||null}catch{};
  if(!pid){try{if(/^[0-9a-f-]{36}$/i.test(String(activeProjectId)))pid=String(activeProjectId)}catch{}}
  if(!pid)throw new Error('This project is not connected to Cloud yet.');
  const q=await c.rpc('fieldverify_create_invite',{p_project:pid,p_role:role,p_uses:1,p_expires_hours:168});
  if(q.error)throw q.error;
  const code=String(q.data||'').trim();if(!code)throw new Error('No invitation code was returned.');
  const out=document.getElementById('fvNewInvite');
  if(out)out.innerHTML=`<div style="margin-top:12px;padding:14px;background:#eef3f8;border-radius:12px;text-align:center"><div class="tiny">INVITATION FOR ${esc(email)}</div><div style="font-size:30px;font-weight:900;letter-spacing:2px">${esc(code)}</div><div class="tiny">One use · Expires in 7 days · Email is opening now.</div></div>`;
  emailInvite(email,code,role);
 }catch(e){alert(e?.message||String(e))}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent='CREATE & EMAIL INVITATION'}}
}
function enhance(){
 const make=document.getElementById('fvMakeInvite'),role=document.getElementById('fvInviteRole');
 if(!make||!role||document.getElementById('fvInviteEmailWrap'))return;
 const wrap=document.createElement('div');wrap.id='fvInviteEmailWrap';wrap.style.cssText='margin-top:10px';
 wrap.innerHTML='<label for="fvInviteEmail" style="display:block;font-weight:900;margin-bottom:5px">EMAIL ADDRESS</label><input id="fvInviteEmail" class="field" type="email" inputmode="email" autocomplete="email" placeholder="person@company.com"><button id="fvMakeInviteEmail" type="button" style="width:100%;padding:13px;margin-top:8px;background:#16803d;color:#fff;border:0;border-radius:11px;font-weight:900">CREATE & EMAIL INVITATION</button><p class="tiny" style="margin-top:6px">This creates a new one-use code and opens your email app with the address, project name and code already filled in. Review it, then tap Send.</p>';
 make.insertAdjacentElement('afterend',wrap);
 document.getElementById('fvMakeInviteEmail').onclick=makeAndEmail;
}
const obs=new MutationObserver(()=>setTimeout(enhance,0));
function start(){enhance();obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(enhance,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.FIELDVERIFY_INVITE_EMAIL={version:VERSION,enhance};
})();