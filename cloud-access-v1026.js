(()=>{
'use strict';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const PENDING='fieldVerifyPendingInviteCode';
let sb=null,busy=false,pendingChecked=false;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
async function client(){
 if(sb)return sb;
 const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
 sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return sb;
}
function cloudProjectId(){
 try{const p=typeof activeProject==='function'?activeProject():null;if(p?.cloudId)return String(p.cloudId)}catch{}
 try{if(typeof activeProjectId!=='undefined'&&/^[0-9a-f-]{36}$/i.test(String(activeProjectId)))return String(activeProjectId)}catch{}
 return null;
}
function msg(text,bad=false){
 const body=document.getElementById('fvCloudBody');if(!body)return;
 let n=document.getElementById('fvAccessMsg');if(!n){n=document.createElement('p');n.id='fvAccessMsg';n.className='tiny';body.appendChild(n)}
 n.style.color=bad?'#a51d17':'#12642f';n.textContent=text;
}
async function createInvitedAccount(){
 if(busy)return;
 const email=document.getElementById('fvEmail')?.value.trim(),password=document.getElementById('fvPass')?.value||'',code=document.getElementById('fvInviteSignupCode')?.value.trim();
 if(!email||password.length<6||!code)return msg('Enter your email, a password of at least 6 characters, and the invitation code.',true);
 busy=true;const b=document.getElementById('fvInvitedSignUp');if(b){b.disabled=true;b.textContent='Creating invited account…'}
 try{
  const c=await client();const r=await c.auth.signUp({email,password});if(r.error)throw r.error;
  localStorage.setItem(PENDING,code);
  if(r.data.session){const j=await c.rpc('fieldverify_join_project',{join_code:code});if(j.error)throw j.error;localStorage.removeItem(PENDING);msg('Account created and project access approved. Reloading…');setTimeout(()=>location.reload(),700)}
  else msg('Account created. Open the confirmation email, confirm it, then sign in. Your invitation code is saved on this device and will be applied automatically.');
 }catch(e){msg(e?.message||String(e),true);if(b){b.disabled=false;b.textContent='CREATE INVITED ACCOUNT'}}finally{busy=false}
}
async function processPending(){
 if(pendingChecked)return;pendingChecked=true;
 const code=localStorage.getItem(PENDING);if(!code)return;
 try{const c=await client(),s=(await c.auth.getSession()).data.session;if(!s){pendingChecked=false;return}
  const j=await c.rpc('fieldverify_join_project',{join_code:code});if(j.error)throw j.error;localStorage.removeItem(PENDING);msg('Invitation accepted. Reloading your project access…');setTimeout(()=>location.reload(),700)
 }catch(e){msg('Invitation could not be applied: '+(e?.message||e),true);pendingChecked=false}
}
function addInviteSignup(){
 const body=document.getElementById('fvCloudBody'),email=document.getElementById('fvEmail');if(!body||!email)return;
 const old=document.getElementById('fvSignUp');if(old)old.style.display='none';
 if(document.getElementById('fvInvitedSignUp'))return;
 const wrap=document.createElement('div');wrap.id='fvInviteSignup';wrap.innerHTML='<div style="margin:14px 0 6px"><b>New worker / invited user</b></div><input id="fvInviteSignupCode" class="field" placeholder="Invitation code" autocomplete="one-time-code"><button id="fvInvitedSignUp" type="button" style="width:100%;padding:13px;margin:6px 0;background:#16803d;color:#fff;border:0;border-radius:11px;font-weight:900">CREATE INVITED ACCOUNT</button><p class="tiny">New accounts need a valid project invitation code. Signing in by itself does not give access to any FieldVerify project.</p>';
 const reset=document.getElementById('fvResetPassword');if(reset)reset.insertAdjacentElement('afterend',wrap);else body.appendChild(wrap);
 document.getElementById('fvInvitedSignUp').onclick=createInvitedAccount;
 processPending();
}
function ensureAccessModal(){
 if(document.getElementById('fvAccessModal'))return;
 const d=document.createElement('div');d.id='fvAccessModal';d.className='hidden';d.style.cssText='position:fixed;inset:0;z-index:700;background:#0009;padding:18px;overflow:auto';
 d.innerHTML='<div style="max-width:620px;margin:4vh auto;background:#fff;border-radius:18px;padding:18px;color:#16202a"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">Manage FieldVerify Access</h2><button id="fvAccessClose" style="padding:9px 12px">Close</button></div><div id="fvAccessBody" style="margin-top:14px"></div></div>';
 document.body.appendChild(d);document.getElementById('fvAccessClose').onclick=()=>d.classList.add('hidden');
}
async function loadMembers(){
 ensureAccessModal();const modal=document.getElementById('fvAccessModal'),body=document.getElementById('fvAccessBody'),pid=cloudProjectId();modal.classList.remove('hidden');
 if(!pid){body.innerHTML='<p>This local project is not connected to Cloud yet.</p>';return}
 body.innerHTML='<p><b>Loading project access…</b></p>';
 try{
  const c=await client(),r=await c.rpc('fieldverify_list_members',{p_project:pid});if(r.error)throw r.error;
  const rows=r.data||[];
  body.innerHTML='<p class="tiny">Only people listed here can open this shared project. Removing someone immediately removes their Cloud access to this project.</p><div id="fvMemberRows"></div><hr style="border:0;border-top:1px solid #d7dee7;margin:18px 0"><h3 style="margin:0 0 8px">Create one-use invitation</h3><select id="fvInviteRole" class="field"><option value="member">Worker — can view and edit</option><option value="viewer">View only</option><option value="admin">Admin — can manage users</option></select><button id="fvMakeInvite" style="width:100%;padding:13px;margin-top:8px;background:#083a73;color:#fff;border:0;border-radius:11px;font-weight:900">CREATE INVITATION CODE</button><div id="fvNewInvite"></div>';
  const box=document.getElementById('fvMemberRows');
  rows.forEach(x=>{
   const row=document.createElement('div');row.style.cssText='border:1px solid #d7dee7;border-radius:12px;padding:11px;margin:8px 0';
   const owner=x.role==='owner';row.innerHTML=`<div style="font-weight:900">${esc(x.email||x.user_id)}</div><div class="tiny" style="margin:3px 0 8px">${owner?'Project owner':'Project member'}</div>${owner?'<b>Owner</b>':`<select class="field fvRole" data-user="${esc(x.user_id)}"><option value="member" ${x.role==='member'?'selected':''}>Worker</option><option value="viewer" ${x.role==='viewer'?'selected':''}>View only</option><option value="admin" ${x.role==='admin'?'selected':''}>Admin</option></select><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button class="fvSaveRole" data-user="${esc(x.user_id)}" style="padding:11px;background:#083a73;color:#fff;border:0;border-radius:10px;font-weight:900">SAVE ROLE</button><button class="fvRemoveUser" data-user="${esc(x.user_id)}" style="padding:11px;background:#b42318;color:#fff;border:0;border-radius:10px;font-weight:900">REMOVE ACCESS</button></div>`}`;
   box.appendChild(row);
  });
  document.querySelectorAll('.fvSaveRole').forEach(b=>b.onclick=async()=>{const u=b.dataset.user,sel=document.querySelector(`.fvRole[data-user="${u}"]`);b.disabled=true;const q=await c.rpc('fieldverify_set_member_role',{p_project:pid,p_user:u,p_role:sel.value});if(q.error){alert(q.error.message);b.disabled=false}else loadMembers()});
  document.querySelectorAll('.fvRemoveUser').forEach(b=>b.onclick=async()=>{const u=b.dataset.user;if(!confirm('Remove this person from the shared FieldVerify project?'))return;b.disabled=true;const q=await c.rpc('fieldverify_remove_member',{p_project:pid,p_user:u});if(q.error){alert(q.error.message);b.disabled=false}else loadMembers()});
  document.getElementById('fvMakeInvite').onclick=async()=>{const b=document.getElementById('fvMakeInvite'),role=document.getElementById('fvInviteRole').value;b.disabled=true;b.textContent='Creating…';const q=await c.rpc('fieldverify_create_invite',{p_project:pid,p_role:role,p_uses:1,p_expires_hours:168});if(q.error){document.getElementById('fvNewInvite').innerHTML=`<p style="color:#a51d17"><b>${esc(q.error.message)}</b></p>`}else document.getElementById('fvNewInvite').innerHTML=`<div style="margin-top:12px;padding:14px;background:#eef3f8;border-radius:12px;text-align:center"><div class="tiny">ONE-USE PROJECT INVITATION CODE</div><div style="font-size:30px;font-weight:900;letter-spacing:2px">${esc(q.data)}</div><div class="tiny">Expires in 7 days. Give this code only to the person you want to add.</div></div>`;b.disabled=false;b.textContent='CREATE INVITATION CODE'};
 }catch(e){body.innerHTML=`<p style="color:#a51d17"><b>${esc(e?.message||e)}</b></p><p class="tiny">Only the project owner or an admin can manage access.</p>`}
}
async function addManager(){
 const body=document.getElementById('fvCloudBody');if(!body||document.getElementById('fvEmail'))return;
 const old=document.getElementById('fvInvite');if(old)old.style.display='none';
 const pid=cloudProjectId();if(!pid||document.getElementById('fvManageAccess'))return;
 try{const c=await client(),r=await c.rpc('fieldverify_list_members',{p_project:pid});if(r.error)return;
  const b=document.createElement('button');b.id='fvManageAccess';b.type='button';b.textContent='MANAGE USERS / INVITES';b.style.cssText='width:100%;padding:13px;margin:6px 0;background:#7b3fc6;color:#fff;border:0;border-radius:11px;font-weight:900';b.onclick=loadMembers;
  const signout=document.getElementById('fvSignOut');if(signout)signout.insertAdjacentElement('beforebegin',b);else body.appendChild(b);
 }catch{}
}
function scan(){addInviteSignup();addManager();processPending()}
const obs=new MutationObserver(()=>setTimeout(scan,0));
function start(){ensureAccessModal();scan();obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(scan,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();