(() => {
 const SUPABASE_URL='https://rnpxwauhtymwcrypwtfs.supabase.co';
 const SUPABASE_KEY='sb_publishable_hxsUdnNW8XB1XnDUYeBFgQ_YRIOJIKV';
 const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
 window.dachwerkSupabase=client;
 const $=id=>document.getElementById(id);
 let registerMode=false, currentUser=null, currentProfile=null, successTransition=false;
 function message(t){$('authMessage').textContent=t||''}
 async function showApp(user,profile){
   if(successTransition) return;
   if(currentUser && currentUser.id===user.id && !$('appShell').hidden) return;
   if(!$('loginScreen').hidden && !successTransition){successTransition=true;const burst=$('loginBurst');if(burst){burst.classList.remove('show');void burst.offsetWidth;burst.classList.add('show');await new Promise(resolve=>setTimeout(resolve,900));burst.classList.remove('show');}}
   currentUser=user;currentProfile=profile;window.dachwerkUser=user;window.dachwerkProfile=profile;
   if(window.initDachwerkCloud) await window.initDachwerkCloud();
   document.body.classList.add('authenticated');
   $('loginScreen').hidden=true;$('appShell').hidden=false;
   $('navUser').textContent=user.email+(profile.is_admin?' · ADMIN':'');
   document.querySelector('[data-view="freigaben"]').style.display=profile.is_admin?'':'none';
 }
 async function checkUser(user){
   if(!user){window.dachwerkUser=null;window.dachwerkProfile=null;document.body.classList.remove('authenticated');$('loginScreen').hidden=false;$('appShell').hidden=true;return}
   const {data:profile,error}=await client.from('profiles').select('id,email,approved,is_admin').eq('id',user.id).maybeSingle();
   if(error){message('Profil konnte nicht geprüft werden: '+error.message);await client.auth.signOut();return}
   if(!profile||!profile.approved){document.body.classList.remove('authenticated');$('loginScreen').hidden=false;$('appShell').hidden=true;message('Zugang wartet auf Freigabe. Bitte den Administrator kontaktieren.');return}
   message('');await showApp(user,profile);
 }
 $('authForm').addEventListener('submit',async e=>{
   e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;
   $('loginSubmit').disabled=true;message(registerMode?'Konto wird erstellt …':'Anmeldung läuft …');
   try{
     if(registerMode){
       const {data,error}=await client.auth.signUp({email,password});
       if(error)throw error;
       if(data.session) await checkUser(data.user);
       else message('Registrierung eingereicht. Falls E-Mail-Bestätigung aktiviert ist, bestätige zuerst die E-Mail. Danach wartet dein Zugang auf Admin-Freigabe.');
     }else{
       const {data,error}=await client.auth.signInWithPassword({email,password});
       if(error)throw error;
       await checkUser(data.user);
     }
   }catch(err){const raw=String(err?.message||'');let friendly=raw;if(/Invalid login credentials/i.test(raw))friendly='E-Mail oder Passwort stimmt nicht. Prüfe die E-Mail in Supabase → Authentication → Users und setze bei Bedarf das Passwort zurück.';else if(/Email not confirmed/i.test(raw))friendly='Bitte bestätige zuerst die E-Mail-Adresse oder prüfe die E-Mail-Bestätigungseinstellung in Supabase.';else if(/Failed to fetch|NetworkError|fetch/i.test(raw))friendly='Supabase ist nicht erreichbar. Bitte Projekt-URL und Internetverbindung prüfen.';message(friendly||'Anmeldung fehlgeschlagen.')}finally{$('loginSubmit').disabled=false}
 });
 $('togglePassword').addEventListener('click',()=>{const input=$('authPassword');const reveal=input.type==='password';input.type=reveal?'text':'password';$('togglePassword').setAttribute('aria-label',reveal?'Passwort verbergen':'Passwort anzeigen');$('togglePassword').setAttribute('aria-pressed',String(reveal));$('togglePassword').innerHTML=reveal?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.9 10.9 0 0112 5c6.4 0 10 7 10 7a16 16 0 01-3.2 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10.6 10.6 0 004-.8"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';});
 $('registerBtn').addEventListener('click',()=>{

   registerMode=!registerMode;$('loginSubmit').innerHTML=registerMode?'Konto erstellen <span>›</span>':'Anmelden <span>›</span>';
   $('registerBtn').textContent=registerMode?'← Zurück zur Anmeldung':'＋ Konto erstellen';
   $('authPassword').autocomplete=registerMode?'new-password':'current-password';
   message(registerMode?'Erstelle ein Konto. Nach der Registrierung muss ein Administrator deinen Zugang freigeben.':'');
 });
 window.signOutDachwerk=async()=>{await client.auth.signOut();currentUser=null;successTransition=false;currentProfile=null;window.dachwerkUser=null;window.dachwerkProfile=null;document.body.classList.remove('authenticated');$('appShell').hidden=true;$('loginScreen').hidden=false;message('Du wurdest abgemeldet.')};
 window.loadPendingUsers=async()=>{
   if(!currentProfile?.is_admin){$('pendingMessage').textContent='Nur Administratoren können Benutzer freigeben.';return}
   $('pendingMessage').textContent='Lade offene Freigaben …';$('pendingUsers').innerHTML='';
   const {data,error}=await client.from('profiles').select('id,email,created_at').eq('approved',false).order('created_at',{ascending:true});
   if(error){$('pendingMessage').textContent='Benutzerliste konnte nicht geladen werden. Die Admin-Leserechte für profiles müssen noch per SQL ergänzt werden. ('+error.message+')';return}
   if(!data.length){$('pendingMessage').textContent='Keine offenen Benutzerfreigaben.';return}
   $('pendingMessage').textContent=data.length+' offene Freigabe(n)';
   data.forEach(u=>{const row=document.createElement('div');row.className='pending-user';const info=document.createElement('div');info.innerHTML='<strong></strong><br><small></small>';info.querySelector('strong').textContent=u.email||'E-Mail unbekannt';info.querySelector('small').textContent='Registriert: '+new Date(u.created_at).toLocaleString('de-DE');const b=document.createElement('button');b.textContent='Freigeben';b.onclick=async()=>{b.disabled=true;b.textContent='Wird freigegeben …';const {data:result,error}=await client.functions.invoke('dachwerk-approve-user',{body:{userId:u.id}});if(error||!result?.success){b.disabled=false;b.textContent='Freigeben';$('pendingMessage').textContent='Freigabe fehlgeschlagen: '+(result?.error||error?.message||'Unbekannter Fehler');return}row.remove();$('pendingMessage').textContent='Benutzer wurde freigegeben.';};row.append(info,b);$('pendingUsers').append(row)});
 };
 client.auth.onAuthStateChange((_event,session)=>{if(session?.user)checkUser(session.user);else{document.body.classList.remove('authenticated');$('loginScreen').hidden=false;$('appShell').hidden=true}});
 client.auth.getSession().then(({data})=>checkUser(data.session?.user||null));
})();