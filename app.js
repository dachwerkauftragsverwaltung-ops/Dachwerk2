let photos=[], currentOrderId=null; const ORDERS_KEY='dw_preview_orders_v3', MAT_KEY='dw_preview_materials_v3', SET_KEY='dw_preview_setup_v3';
const $=id=>document.getElementById(id), uid=()=> (window.crypto&&crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)}));
let cloudBusy=false, cloudInitialized=false, cloudChannel=null, cloudRefreshPending=false;
function sb(){return window.dachwerkSupabase||null}
function isCloudUser(){return !!(sb()&&window.dachwerkUser&&window.dachwerkProfile&&window.dachwerkProfile.approved)}
function cloudError(err,where){console.error('DACHWERK Supabase '+where,err);alert(where+' fehlgeschlagen: '+(err?.message||'Unbekannter Fehler'));}
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}} function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
const defaultM=[['02 ATTIKA ABDECKUNG Aluminium','m'],['02 Alublech 0,7mm','m²'],['02 Alublech Anthrazit 0,7 mm','m²'],['02 Kehldichtstreifen','m'],['02 Kehlabdeckung Zinkblech','m'],['02 Zinkblech 0,7 mm','m²'],['03 Fallrohr Waschbär Abwehrschutz','Stück'],['03 Standrohr LORO X mit Klappe 1000 mm','Stück'],['03 Standrohr LORO X mit Klappe 2000 mm','Stück'],['03-LORO-X Rohrschelle','Stück'],['03 Zink Dachrinne 6-teilig','m'],['03 Zink Dachrinne komplett','m'],['03 Zink Dachrinneneisen','Stück'],['03 Zink Dachrinnenzubehör','Stück'],['03 Zink Fallrohr 100er','m'],['03 Zink Fallrohrschellen 100er','Stück'],['04 Kemperol 1K Flüssigkunststoff','kg'],['04 Kemperol 1K Grundierung','kg'],['04 Kemperol Notpflaster','Stück'],['04 Kemperol Vlies','m²'],['05 ALWITRA VGSK Evalon KS Bahnen','m²'],['05 ALWITRA Verbundblech Evalon','m'],['05 ALWITRA Wandanschlüsse','m'],['06 Allwetter Dichtmasse','Stück'],['06 Bitu-Dicht Spezial 310 ml Kartusche','Stück'],['06 Bornit Kaltspachtel','kg'],['06 Acryl','Stück'],['06 EPDM Notpflaster','Stück'],['06 IWETEC Alles Dicht','Stück'],['06 Wand-Kaminanschluss Band','m'],['07 Alu Wandanschlussschiene','m'],['07 Dachausstiegfenster','Stück'],['07 Fugendichtmasse','Stück'],['07 Kaminkopfabdeckung','Stück'],['07 Kaminsanierung komplett','Stück'],['07 Wand-Kaminanschlüsse erneuern','m'],['08 Antennenziegel Blei','Stück'],['08 Dachtritte aus verzinktem Stahl','m'],['08 Eternit Wabenziegel','Stück'],['08 Frankfurter Pfanne','Stück'],['08 Greaton Ziegel Harmonie','Stück'],['08 Jakobi Hohlpfanne','Stück'],['08 Lüftungsrohr auf Frankfurter Pfanne','Stück'],['08 Schiefer Schindeln','Stück'],['09 DACH Laubfang Gully 100er Edelstahl','Stück'],['09 DACH Laubfangkorb','Stück'],['09 DACH Laubstopp Dachrinnenschutz','Stück'],['09 Walz Blei','kg'],['10 Bitumen Voranstrich','Liter'],['10 Bitumenschweißbahn VEDAC PYE PV 200 S 5 EN','m²'],['11 Dachlatten F/T','m'],['11 Edelstahl Spengler Schrauben','Stück'],['12 ABS Dachsicherungshaken','Stück'],['12 Dachsicherungshaken','Stück']];
const defaultS=[['12 Hubsteiger Stunden','Stunden'],['12 Gerüst - Leihdauer 4 Wochen','m²'],['12 Rollgerüst','Stück'],['12 Bockgerüst','Stück'],['12 Dachbockgerüst','Stück']];
let materials=read(MAT_KEY,defaultM.map(x=>({id:uid(),name:x[0],unit:x[1]}))), setups=read(SET_KEY,defaultS.map(x=>({id:uid(),name:x[0],unit:x[1]}))), orders=read(ORDERS_KEY,[]);
function showView(n){document.querySelectorAll('.appview').forEach(v=>v.hidden=true);let v=$('view-'+n);if(!v)return;v.hidden=false;document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===n));if(n==='auftraege')renderOrders();if(n==='buero')renderOffice();if(n==='stammdaten')renderMasters()}
function nextNo(dateValue){let d=dateValue||new Date().toISOString().slice(0,10);let nums=orders.map(o=>String(o.auftragsnr||'')).filter(x=>x.startsWith(d+'-')).map(x=>parseInt(x.split('-').pop(),10)||0);return d+'-'+(Math.max(0,...nums)+1)}
async function newOrder(){currentOrderId=null;showView('auftrag');resetForm();updateLabel();if(isCloudUser()){const date=$('datum').value;const {data,error}=await sb().rpc('dachwerk_next_order_number',{target_date:date});if(error){alert('Auftragsnummer konnte nicht zentral reserviert werden. Bitte zuerst die zusätzliche SQL-Abfrage ausführen. ('+error.message+')');return}if(data)$('auftragsnr').value=data;updateLabel()}}
function resetForm(){['angebotsnr','kunde','kontakt','objekt','montageHinweis','arbeiten','signOrt'].forEach(i=>$(i).value='');let d=new Date().toISOString().slice(0,10);$('datum').value=d;$('auftragsnr').value=nextNo(d);$('montageDatum').value=d;$('montageZeit').value='08:00';$('signDatum').value=d;$('status').value='offen';$('addressStatus').textContent='';photos=[];renderPhotos();$('employeeRows').innerHTML='';addEmployeeRow();$('fahrtkostenRows').innerHTML='';addFahrtkosten({datum:d,betrag:'49.00'});$('material').innerHTML='';addMaterial();$('baustellenkosten').innerHTML='';addSetupRow();clearSig('sigKunde');clearSig('sigFirma');updateLabel()}
function addFahrtkosten(d={}){const box=$('fahrtkostenRows');const row=document.createElement('div');row.className='travel-row';const date=input('Datum',d.datum||$('datum').value,'travel-date');date.type='date';const amount=input('Betrag (€)',d.betrag??'49.00','travel-amount');amount.type='number';amount.min='0';amount.step='0.01';amount.addEventListener('input',updateFahrtkostenSum);const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Fahrtkosten entfernen';del.onclick=()=>{row.remove();updateFahrtkostenSum()};row.append(date,amount,del);box.appendChild(row);updateFahrtkostenSum()}
function getFahrtkosten(){return [...document.querySelectorAll('#fahrtkostenRows .travel-row')].map(r=>({datum:r.querySelector('.travel-date').value,betrag:r.querySelector('.travel-amount').value})).filter(x=>x.datum||x.betrag)}
function updateFahrtkostenSum(){const total=getFahrtkosten().reduce((a,x)=>a+(parseFloat(String(x.betrag||'0').replace(',','.'))||0),0);const el=$('fahrtkostenSum');if(el)el.textContent='Summe Fahrtkosten: '+total.toFixed(2).replace('.',',')+' €'}
function updateLabel(){let o=orders.find(x=>x.id===currentOrderId);$('currentOrderLabel').textContent=o?(o.auftragsnr+' · '+(o.kunde||o.objekt||'Auftrag')):'Neuer Auftrag'}
function input(ph,val,cls=''){let i=document.createElement('input');i.placeholder=ph;i.value=val||'';i.className=cls;if(cls==='qty'){i.readOnly=true;i.setAttribute('aria-label','Verbrauch bearbeiten');i.title='Tippen, um Verbrauch groß zu bearbeiten';i.addEventListener('click',()=>openConsumptionEditor(i));}return i}
let consumptionTarget=null;
function openConsumptionEditor(target){consumptionTarget=target;const modal=$('consumptionModal');$('consumptionText').value=target.value||'';modal.hidden=false;document.body.classList.add('modal-open');setTimeout(()=>$('consumptionText').focus(),50)}
function closeConsumptionEditor(save){if(save&&consumptionTarget){consumptionTarget.value=$('consumptionText').value;consumptionTarget.dispatchEvent(new Event('input',{bubbles:true}));} $('consumptionModal').hidden=true;document.body.classList.remove('modal-open');consumptionTarget=null}
function voiceConsumption(){if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){alert('Spracheingabe wird von diesem Browser nicht unterstützt.');return}const R=window.SpeechRecognition||window.webkitSpeechRecognition,r=new R();r.lang='de-DE';r.interimResults=false;r.continuous=false;r.onresult=e=>{const text=e.results[0][0].transcript;const box=$('consumptionText');box.value+=(box.value.trim()?' ':'')+text};r.onerror=()=>alert('Die Spracheingabe konnte nicht gestartet werden. Bitte Mikrofonfreigabe prüfen.');r.start()}
function updateEmployeeSummary(){
  let total=0;
  document.querySelectorAll('#employeeRows .hours').forEach(x=>{
    const n=parseFloat(String(x.value||'').replace(',','.'));
    if(Number.isFinite(n)) total+=n;
  });
  const box=$('employeeSummary');
  if(box) box.textContent='Summe Arbeitsstunden: '+total.toFixed(2).replace('.',',')+' h';
}
function addEmployeeRow(d={}){
  let r=document.createElement('div');
  r.className='employee-row';
  r.innerHTML='<input placeholder="Mitarbeiter" class="ename" aria-label="Mitarbeiter"><input type="time" class="beg" aria-label="Beginn"><input type="time" class="end" aria-label="Ende"><input type="number" min="0" class="pause" placeholder="0" aria-label="Pause in Minuten"><input class="hours" readonly aria-label="Arbeitsstunden"><button type="button" aria-label="Mitarbeiter entfernen">×</button>';
  r.querySelector('.ename').value=d.name||'';
  r.querySelector('.beg').value=d.beg||'';
  r.querySelector('.end').value=d.end||'';
  r.querySelector('.pause').value=d.pause??'';
  let calc=()=>{
    let a=r.querySelector('.beg').value,b=r.querySelector('.end').value,p=Number(r.querySelector('.pause').value)||0;
    if(a&&b){
      let [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);
      let mins=(bh*60+bm)-(ah*60+am)-p;
      if(mins<0) mins+=1440;
      r.querySelector('.hours').value=(Math.max(0,mins)/60).toFixed(2).replace('.',',');
    } else r.querySelector('.hours').value='';
    updateEmployeeSummary();
  };
  r.querySelectorAll('input').forEach(x=>x.addEventListener('input',calc));
  r.querySelector('button').onclick=()=>{r.remove();updateEmployeeSummary()};
  $('employeeRows').appendChild(r);
  calc();
}
function addMaterial(d={}){let r=document.createElement('div');r.className='matrow';let sel=document.createElement('select');sel.innerHTML='<option value="">Material auswählen …</option>'+materials.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');sel.value=d.id||'';let q=input('Verbrauch',d.qty,'qty'),u=input('Einheit',d.unit,'unit');u.readOnly=true;sel.onchange=()=>{let m=materials.find(x=>x.id===sel.value);u.value=m?.unit||''};let b=document.createElement('button');b.type='button';b.textContent='×';b.onclick=()=>r.remove();r.append(sel,q,u,b);$('material').appendChild(r);if(d.id)sel.onchange()}
function addSetupRow(d={}){let r=document.createElement('div');r.className='setuprow';let sel=document.createElement('select');sel.innerHTML='<option value="">Position auswählen …</option>'+setups.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');sel.value=d.id||'';let q=input('Verbrauch',d.qty,'qty'),u=input('Einheit',d.unit,'unit');u.readOnly=true;sel.onchange=()=>{let m=setups.find(x=>x.id===sel.value);u.value=m?.unit||''};let b=document.createElement('button');b.type='button';b.textContent='×';b.onclick=()=>r.remove();r.append(sel,q,u,b);$('baustellenkosten').appendChild(r);if(d.id)sel.onchange()}
async function addMaterialMaster(){materials.push({id:uid(),name:'',unit:'Stück'});write(MAT_KEY,materials);renderMasters();await saveMasterRows('dachwerk_materials',materials)}
async function addSetupMaster(){setups.push({id:uid(),name:'',unit:'Stück'});write(SET_KEY,setups);renderMasters();await saveMasterRows('dachwerk_setup_items',setups)}
async function saveMasterRows(table,rows){if(!isCloudUser())return;const payload=rows.filter(x=>x.name?.trim()).map(x=>table==='dachwerk_materials'?{id:x.id,material:x.name.trim(),einheit:x.unit||''}:{id:x.id,bezeichnung:x.name.trim(),einheit:x.unit||''});if(!payload.length)return;const {error}=await sb().from(table).upsert(payload,{onConflict:'id'});if(error)cloudError(error,'Stammdaten speichern')}
async function deleteMasterRow(table,id){if(!isCloudUser())return;const {error}=await sb().from(table).delete().eq('id',id);if(error)cloudError(error,'Stammdaten löschen')}
function renderMasters(){let mbox=$('materialMaster');mbox.innerHTML='';materials.forEach((m,i)=>{let r=document.createElement('div');r.className='masterrow';r.innerHTML='<input class="mname"><input class="munit"><button>×</button>';r.querySelector('.mname').value=m.name;r.querySelector('.munit').value=m.unit;let save=()=>{m.name=r.querySelector('.mname').value;m.unit=r.querySelector('.munit').value;write(MAT_KEY,materials)};r.querySelectorAll('input').forEach(x=>{x.oninput=save;x.onchange=()=>{save();saveMasterRows('dachwerk_materials',[m])}});r.querySelector('button').onclick=async()=>{materials.splice(i,1);write(MAT_KEY,materials);renderMasters();await deleteMasterRow('dachwerk_materials',m.id)};mbox.appendChild(r)});let sbox=$('setupMaster');sbox.innerHTML='';setups.forEach((m,i)=>{let r=document.createElement('div');r.className='masterrow';r.innerHTML='<input class="mname"><input class="munit"><button>×</button>';r.querySelector('.mname').value=m.name;r.querySelector('.munit').value=m.unit;let save=()=>{m.name=r.querySelector('.mname').value;m.unit=r.querySelector('.munit').value;write(SET_KEY,setups)};r.querySelectorAll('input').forEach(x=>{x.oninput=save;x.onchange=()=>{save();saveMasterRows('dachwerk_setup_items',[m])}});r.querySelector('button').onclick=async()=>{setups.splice(i,1);write(SET_KEY,setups);renderMasters();await deleteMasterRow('dachwerk_setup_items',m.id)};sbox.appendChild(r)})}
function collect(){return{id:currentOrderId||uid(),auftragsnr:$('auftragsnr').value,angebotsnr:$('angebotsnr').value,kunde:$('kunde').value,kontakt:$('kontakt').value,datum:$('datum').value,objekt:$('objekt').value,status:$('status').value,arbeiten:$('arbeiten').value,signOrt:$('signOrt').value,signDatum:$('signDatum').value,signatures:{customer:sigData('sigKunde'),employee:sigData('sigFirma')},montage:{art:$('terminArt').value||'Montagetermin',datum:$('montageDatum').value,zeit:$('montageZeit').value,hinweis:$('montageHinweis').value},fahrtkosten:getFahrtkosten(),updatedAt:new Date().toISOString(),materials:[...document.querySelectorAll('#material .matrow')].map(r=>({id:r.querySelector('select').value,qty:r.querySelector('.qty').value,unit:r.querySelector('.unit').value})).filter(x=>x.id||x.qty.trim()),setup:[...document.querySelectorAll('#baustellenkosten .setuprow')].map(r=>({id:r.querySelector('select').value,qty:r.querySelector('.qty').value,unit:r.querySelector('.unit').value})).filter(x=>x.id||x.qty.trim()),employees:[...document.querySelectorAll('.employee-row')].map(r=>({name:r.querySelector('.ename').value,beg:r.querySelector('.beg').value,end:r.querySelector('.end').value,pause:r.querySelector('.pause').value,hours:r.querySelector('.hours').value})).filter(x=>x.name),photos:photos.map(p=>({...p}))}}
function dataUrlBlob(dataUrl){const parts=dataUrl.split(',');const mime=(parts[0].match(/:(.*?);/)||[])[1]||'image/jpeg';const raw=atob(parts[1]);const arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return new Blob([arr],{type:mime})}
async function uploadOrderPhotos(d){const client=sb(),old=orders.find(o=>o.id===d.id),oldPaths=new Set((old?.photos||[]).map(p=>p.path).filter(Boolean));for(let i=0;i<d.photos.length;i++){const p=d.photos[i];if(p.src&&p.src.startsWith('data:image/')){const path=p.path||`orders/${d.id}/${uid()}.jpg`;const {error}=await client.storage.from('dachwerk-photos').upload(path,dataUrlBlob(p.src),{contentType:'image/jpeg',upsert:true});if(error)throw error;p.path=path;p.size=p.size||0;oldPaths.delete(path)}else if(p.path){oldPaths.delete(p.path)}else if(p.src&&p.src.startsWith('http')){const match=p.src.match(/dachwerk-photos\/(.+?)(?:\?|$)/);if(match)p.path=decodeURIComponent(match[1])}}
 if(oldPaths.size){const {error}=await client.storage.from('dachwerk-photos').remove([...oldPaths]);if(error)throw error}return d}
async function saveOrder(){let d=collect();if(!d.kunde&&!d.objekt){alert('Bitte Auftraggeber oder Objektadresse eintragen.');return}if(!isCloudUser()){alert('Bitte zuerst anmelden und auf die Benutzerfreigabe warten.');return}const button=document.querySelector('#view-auftrag .actions .primary');if(button){button.disabled=true;button.textContent='Wird gespeichert …'}try{cloudBusy=true;d=await uploadOrderPhotos(d);const stored={...d,photos:d.photos.map(({src,...p})=>p)};const {error}=await sb().from('dachwerk_orders').upsert({id:d.id,order_number:d.auftragsnr,data:stored,created_by:window.dachwerkUser.id,updated_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error;let i=orders.findIndex(x=>x.id===d.id);if(i<0)orders.push(d);else orders[i]=d;currentOrderId=d.id;write(ORDERS_KEY,orders);updateLabel();renderOrders();renderOffice();updateStorage();alert('Auftrag zentral in Supabase gespeichert. Andere freigegebene Benutzer sehen ihn nach dem Laden bzw. per Live-Sync.')}catch(e){cloudError(e,'Auftrag/Fotos speichern')}finally{cloudBusy=false;if(button){button.disabled=false;button.textContent='Auftrag speichern'}}}
async function deleteOrder(id){if(!confirm('Auftrag inklusive aller Baustellenfotos wirklich löschen?'))return;if(!isCloudUser()){alert('Bitte zuerst anmelden.');return}const order=orders.find(x=>x.id===id);try{const paths=(order?.photos||[]).map(p=>p.path).filter(Boolean);if(paths.length){const {error:storageError}=await sb().storage.from('dachwerk-photos').remove(paths);if(storageError)throw storageError}const {error}=await sb().from('dachwerk_orders').delete().eq('id',id);if(error)throw error;orders=orders.filter(x=>x.id!==id);write(ORDERS_KEY,orders);renderOrders();renderOffice();updateStorage();alert('Auftrag und gespeicherte Fotos wurden gelöscht.')}catch(e){cloudError(e,'Auftrag löschen; Datensatz blieb soweit möglich erhalten')}}
function openOrder(id){let d=orders.find(x=>x.id===id);if(!d)return;currentOrderId=id;showView('auftrag');['auftragsnr','angebotsnr','kunde','kontakt','datum','objekt','arbeiten','status'].forEach(k=>$(k).value=d[k]||'');$('signOrt').value=d.signOrt||'';$('signDatum').value=d.signDatum||d.datum||'';loadSignature('sigKunde',d.signatures?.customer);loadSignature('sigFirma',d.signatures?.employee);$('terminArt').value=d.montage?.art||'Montagetermin';$('montageDatum').value=d.montage?.datum||'';$('montageZeit').value=d.montage?.zeit||'';$('montageHinweis').value=d.montage?.hinweis||'';$('fahrtkostenRows').innerHTML='';let fk=d.fahrtkosten||((d.fahrt?.kosten||d.fahrt?.km||d.fahrt?.hinweis)?[{datum:d.datum||'',betrag:d.fahrt?.kosten||'49.00'}]:[{datum:d.datum||'',betrag:'49.00'}]);fk.forEach(addFahrtkosten);if(!fk.length)addFahrtkosten({datum:d.datum||'',betrag:'49.00'});$('employeeRows').innerHTML='';(d.employees||[]).forEach(addEmployeeRow);$('material').innerHTML='';(d.materials||[]).forEach(addMaterial);$('baustellenkosten').innerHTML='';(d.setup||[]).forEach(addSetupRow);photos=(d.photos||[]).map(x=>({...x}));renderPhotos();updateLabel()}
function orderCard(o){let d=document.createElement('article');d.className='order-card';let m=o.montage||{};let statusLabel={offen:'Offen',bearbeitung:'In Bearbeitung',erledigt:'Erledigt',abgeschlossen:'Ohne Terminvergabe',ohne_terminvergabe:'Ohne Terminvergabe'}[o.status]||o.status||'Offen';d.innerHTML=`<div class="order-main"><div><span class="eyebrow">${statusLabel}</span><h3>${o.auftragsnr||''} · ${o.kunde||'Ohne Auftraggeber'}</h3><p>📅 <b>${m.art||'Montagetermin'}:</b> ${m.datum?new Date(m.datum+'T12:00').toLocaleDateString('de-DE'): 'nicht geplant'} ${m.zeit?'· '+m.zeit+' Uhr':''}</p><p class="order-address">📍 ${o.objekt||'Keine Adresse hinterlegt'}</p>${o.angebotsnr?`<p>🏷️ Angebot: ${o.angebotsnr}</p>`:''}</div><div class="order-actions"><button onclick="openOrder('${o.id}')">Öffnen</button><button onclick="navigateTo('${encodeURIComponent(o.objekt||'')}')">🧭 Ab zur Baustelle</button><button onclick="addOrderToCalendar('${o.id}')">📅 Kalender</button><button class="danger" onclick="deleteOrder('${o.id}')">🗑 Löschen</button></div></div>`;return d}
function renderOrders(){let box=$('orderList');box.innerHTML='';let query=($('orderSearch')?.value||'').trim().toLocaleLowerCase('de-DE');let sortMode=$('montageSort')?.value||'newest';let active=orders.filter(o=>['offen','bearbeitung','abgeschlossen','ohne_terminvergabe'].includes(o.status||'offen')).filter(o=>!query||[o.kunde,o.auftragsnr,o.objekt,o.angebotsnr,o.kontakt,o.arbeiten].some(v=>String(v||'').toLocaleLowerCase('de-DE').includes(query)));const byMontageDate=(a,b)=>{let da=String(a.montage?.datum||''),db=String(b.montage?.datum||'');if(!da&&!db)return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));if(!da)return 1;if(!db)return -1;let cmp=da.localeCompare(db);return sortMode==='oldest'?cmp:-cmp};active.sort(byMontageDate);if(!active.length){box.innerHTML='<p class="empty-state">'+(query?'Keine passenden Aufträge gefunden.':'Keine offenen, bearbeiteten oder Aufträge ohne Terminvergabe vorhanden.')+'</p>';return}let open=active.filter(o=>(o.status||'offen')==='offen'),work=active.filter(o=>o.status==='bearbeitung'),noAppointment=active.filter(o=>['abgeschlossen','ohne_terminvergabe'].includes(o.status));[{title:'Offene Aufträge',items:open},{title:'In Bearbeitung',items:work},{title:'Ohne Terminvergabe',items:noAppointment}].forEach(g=>{let sec=document.createElement('section');sec.className='order-group';sec.innerHTML=`<div class="order-group-title"><h3>${g.title}</h3><span>${g.items.length}</span></div>`;if(!g.items.length){let e=document.createElement('p');e.className='empty-state group-empty';e.textContent='Keine Aufträge in diesem Bereich.';sec.appendChild(e)}else g.items.forEach(o=>sec.appendChild(orderCard(o)));box.appendChild(sec)})}
function renderOffice(){let box=$('officeList');if(!box)return;box.innerHTML='';let office=orders.filter(o=>o.status==='erledigt').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));if(!office.length){box.innerHTML='<p class="empty-state">Noch keine erledigten Aufträge.</p>';return}let sec=document.createElement('section');sec.className='order-group';sec.innerHTML=`<div class="order-group-title"><h3>Erledigt</h3><span>${office.length}</span></div>`;office.forEach(o=>sec.appendChild(orderCard(o)));box.appendChild(sec)}
function navigateTo(addr){if(!addr){alert('Keine Objektadresse hinterlegt.');return}window.open('https://www.google.com/maps/search/?api=1&query='+addr,'_blank')}
function addOrderToCalendar(id){let o=orders.find(x=>x.id===id);if(!o)return;downloadICS(o)}
function addToCalendar(){let d=collect();if(!d.montage.datum||!d.montage.zeit){alert('Bitte Montagetermin mit Datum und Uhrzeit eintragen.');return}downloadICS(d)}
function downloadICS(o){let dt=o.montage?.datum, tm=o.montage?.zeit||'08:00';if(!dt)return;let [y,m,day]=dt.split('-'),[hh,mm]=tm.split(':');let start=`${y}${m}${day}T${hh}${mm}00`;let endMin=(Number(hh)*60+Number(mm)+120)%1440, ey=y,em=m,ed=day;if(Number(hh)*60+Number(mm)+120>=1440){let x=new Date(dt+'T'+tm);x.setMinutes(x.getMinutes()+120);ey=x.getFullYear();em=String(x.getMonth()+1).padStart(2,'0');ed=String(x.getDate()).padStart(2,'0')}let end=`${ey}${em}${ed}T${String(Math.floor(endMin/60)).padStart(2,'0')}${String(endMin%60).padStart(2,'0')}00`;let esc=s=>String(s||'').replace(/[\\;,]/g,c=>'\\'+c).replace(/\n/g,'\\n');let ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DACHWERK//DE\r\nBEGIN:VEVENT\r\nUID:${o.id}@dachwerk\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${esc('DACHWERK '+(o.montage?.art||'Montagetermin')+' – '+(o.kunde||o.objekt))}\r\nLOCATION:${esc(o.objekt)}\r\nDESCRIPTION:${esc('Auftrag '+o.auftragsnr+(o.angebotsnr?' | Angebot '+o.angebotsnr:'')+(o.montage?.hinweis?' | '+o.montage.hinweis:''))}\r\nEND:VEVENT\r\nEND:VCALENDAR`;let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download=(o.auftragsnr||'DACHWERK')+'_'+(o.montage?.art||'Montagetermin').replace(/\s+/g,'_')+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function checkAddress(){let raw=$('objekt').value.trim(), st=$('addressStatus');if(!raw){st.textContent='⚠ Adresse fehlt';return}st.textContent='Prüfe Adresse …';try{let r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=de&q='+encodeURIComponent(raw),{headers:{'Accept':'application/json'}});let a=await r.json();if(a.length){let x=a[0].address||{};let street=[x.road,x.house_number].filter(Boolean).join(' ');let city=x.city||x.town||x.village||x.municipality||'';let short=[street,[x.postcode,city].filter(Boolean).join(' ')].filter(Boolean).join(', ');$('objekt').value=short||raw;st.textContent='✓ Adresse gefunden'}else{st.textContent='⚠ Adresse nicht gefunden – bitte prüfen'}}catch(e){st.textContent='ℹ Prüfung gerade nicht erreichbar'}}
function compress(file){return new Promise(res=>{let img=new Image();img.onload=()=>{let max=1800,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{let rd=new FileReader();rd.onload=()=>res({src:rd.result,size:b.size,name:file.name});rd.readAsDataURL(b)},'image/jpeg',.78)};img.src=URL.createObjectURL(file)})}
async function addPhotos(e){let existing=new Set(photos.map(p=>p.name+'|'+p.size));for(const f of [...e.target.files]){let key=f.name+'|'+f.size;if(existing.has(key))continue;let p=await compress(f);photos.push(p);existing.add(key)}e.target.value='';renderPhotos();updateStorage()}
function renderPhotos(){let box=$('photoPreview');box.innerHTML='';photos.forEach((p,i)=>{let d=document.createElement('div');d.className='photoitem';d.innerHTML=`<img src="${p.src}" alt="${p.name}"><button class="mark-btn" type="button" onclick="openPhotoEditor(${i})">🔴 Markieren</button><button type="button" onclick="photos.splice(${i},1);renderPhotos();updateStorage()">×</button><small>${p.name}</small></div>`;box.appendChild(d)})}
let photoEditIndex=-1,photoEditOriginal='';
function openPhotoEditor(i){photoEditIndex=i;let p=photos[i];if(!p)return;photoEditOriginal=p.origSrc||p.src;let img=new Image();img.onload=()=>{let c=$('photoCanvas'),max=1000,scale=Math.min(1,max/img.width,max/img.height);c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));let ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);ctx.strokeStyle='#d40000';ctx.lineWidth=Math.max(5,c.width/120);ctx.lineCap='round';ctx.lineJoin='round';bindPhotoDrawing(c,ctx);$('photoEditor').hidden=false;$('photoEditor').setAttribute('aria-hidden','false')};img.src=p.src}
function bindPhotoDrawing(c,ctx){if(c._bound){c.removeEventListener('pointerdown',c._pd);c.removeEventListener('pointermove',c._pm);c.removeEventListener('pointerup',c._pu);c.removeEventListener('pointercancel',c._pu)}let drawing=false,last=null;const point=e=>{let r=c.getBoundingClientRect();return[(e.clientX-r.left)*(c.width/r.width),(e.clientY-r.top)*(c.height/r.height)]};c._pd=e=>{e.preventDefault();drawing=true;try{c.setPointerCapture(e.pointerId)}catch(_){}last=point(e);ctx.beginPath();ctx.arc(last[0],last[1],Math.max(3,c.width/180),0,Math.PI*2);ctx.fillStyle='#d40000';ctx.fill()};c._pm=e=>{if(!drawing)return;e.preventDefault();let q=point(e);ctx.beginPath();ctx.moveTo(last[0],last[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle='#d40000';ctx.lineWidth=Math.max(7,c.width/100);ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();last=q};c._pu=()=>{drawing=false;last=null};c.addEventListener('pointerdown',c._pd);c.addEventListener('pointermove',c._pm);c.addEventListener('pointerup',c._pu);c.addEventListener('pointercancel',c._pu);c._bound=true}
function resetPhotoMarking(){let p=photos[photoEditIndex];if(!p)return;let img=new Image();img.onload=()=>{let c=$('photoCanvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height)};img.src=photoEditOriginal}
function savePhotoMarking(){if(photoEditIndex<0)return;let c=$('photoCanvas');photos[photoEditIndex].src=c.toDataURL('image/jpeg',.82);photos[photoEditIndex].size=Math.round(photos[photoEditIndex].src.length*.75);renderPhotos();updateStorage();closePhotoEditor()}
function closePhotoEditor(){photoEditIndex=-1;$('photoEditor').hidden=true;$('photoEditor').setAttribute('aria-hidden','true')}
async function updateStorage(){
  const text=$('storageText'),bar=$('storageBar');if(!text||!bar)return;
  if(isCloudUser()){
    text.textContent='Speicher wird geladen …';
    try{
      const bucket=sb().storage.from('dachwerk-photos');let bytes=0,count=0;
      async function walk(prefix=''){
        let offset=0;const limit=100;
        while(true){
          const {data,error}=await bucket.list(prefix,{limit,offset,sortBy:{column:'name',order:'asc'}});
          if(error)throw error;
          const items=data||[];
          for(const item of items){
            const path=prefix?prefix+'/'+item.name:item.name;
            if(item.id==null || item.metadata==null){await walk(path)}
            else {const size=Number(item.metadata?.size??item.metadata?.contentLength??0);bytes+=Number.isFinite(size)?size:0;count++}
          }
          if(items.length<limit)break;offset+=items.length;
        }
      }
      await walk('');
      const mb=bytes/1048576;
      text.textContent=`${mb.toFixed(2)} MB belegt · ${count} Datei${count===1?'':'en'} · Supabase Storage`;
      // Der Balken ist nur eine Orientierung bezogen auf 500 MB, kein vom Anbieter gemeldetes Kontingent.
      bar.style.width=Math.min(100,bytes/(500*1048576)*100)+'%';
      bar.title='Orientierungsbalken bezogen auf 500 MB; kein Nachweis des tatsächlichen Tariflimits';
      return;
    }catch(e){
      console.warn('Supabase-Fotospeicher konnte nicht gelesen werden',e);
      text.textContent='Speicherstand nicht abrufbar – Bucket-/List-Berechtigung prüfen';
      bar.style.width='0%';bar.title=e?.message||'Storage-Lesefehler';return;
    }
  }
  const bytes=orders.reduce((s,o)=>s+(o.photos||[]).reduce((a,p)=>a+(Number(p.size)||0),0),0)+photos.filter(p=>!p.path).reduce((s,p)=>s+(Number(p.size)||0),0);
  const mb=bytes/1048576;text.textContent=`${mb.toFixed(2)} MB · lokale Vorschau (nicht hochgeladen)`;bar.style.width=Math.min(100,bytes/(500*1048576)*100)+'%';bar.title='Lokale Vorschau, kein echter Supabase-Speicherstand';
}
async function refreshDemo(){if(!isCloudUser()){alert('Bitte anmelden und freigeschaltet sein.');return}await loadCloudData(true)}
async function loadCloudData(showMessage=false){if(!isCloudUser()||cloudBusy)return;cloudBusy=true;try{const client=sb();const [or,ma,se]=await Promise.all([client.from('dachwerk_orders').select('id,order_number,data,updated_at').order('updated_at',{ascending:false}),client.from('dachwerk_materials').select('id,material,einheit').order('material'),client.from('dachwerk_setup_items').select('id,bezeichnung,einheit').order('bezeichnung')]);for(const x of [or,ma,se])if(x.error)throw x.error;orders=(or.data||[]).map(r=>({...r.data,id:r.id,auftragsnr:r.order_number,updatedAt:r.updated_at||r.data?.updatedAt||''}));materials=(ma.data||[]).map(x=>({id:x.id,name:x.material,unit:x.einheit||''}));setups=(se.data||[]).map(x=>({id:x.id,name:x.bezeichnung,unit:x.einheit||''}));if(!materials.length){materials=read(MAT_KEY,defaultM.map(x=>({id:uid(),name:x[0],unit:x[1]})));materials=materials.map(m=>({...m,id:validUuid(m.id)?m.id:uid()}));await saveMasterRows('dachwerk_materials',materials);const q=await client.from('dachwerk_materials').select('id,material,einheit').order('material');if(!q.error)materials=q.data.map(x=>({id:x.id,name:x.material,unit:x.einheit||''}))}if(!setups.length){setups=read(SET_KEY,defaultS.map(x=>({id:uid(),name:x[0],unit:x[1]})));setups=setups.map(m=>({...m,id:validUuid(m.id)?m.id:uid()}));await saveMasterRows('dachwerk_setup_items',setups);const q=await client.from('dachwerk_setup_items').select('id,bezeichnung,einheit').order('bezeichnung');if(!q.error)setups=q.data.map(x=>({id:x.id,name:x.bezeichnung,unit:x.einheit||''}))}for(const o of orders){for(const p of o.photos||[]){if(p.path){const {data,error}=await client.storage.from('dachwerk-photos').createSignedUrl(p.path,3600);if(!error&&data?.signedUrl)p.src=data.signedUrl}}}write(ORDERS_KEY,orders);write(MAT_KEY,materials);write(SET_KEY,setups);renderOrders();renderOffice();renderMasters();updateStorage();if(currentOrderId){const o=orders.find(x=>x.id===currentOrderId);if(o){photos=(o.photos||[]).map(x=>({...x}));renderPhotos()}}if(showMessage)alert('Supabase aktualisiert. Die neuesten Aufträge, Materialdaten und Baustelleneinrichtungen wurden geladen.')}catch(e){cloudError(e,'Daten aktualisieren')}finally{cloudBusy=false}}
function validUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'')}
function scheduleCloudRefresh(){
  const active=document.activeElement;
  if(active && active.matches('#materialMaster input, #setupMaster input')){cloudRefreshPending=true;return;}
  loadCloudData(false);
}
['materialMaster','setupMaster'].forEach(id=>{
  document.addEventListener('focusout',e=>{
    if(e.target && e.target.matches('#'+id+' input')){
      setTimeout(()=>{if(cloudRefreshPending){cloudRefreshPending=false;loadCloudData(false)}},250);
    }
  },true);
});
window.initDachwerkCloud=async function(){if(cloudInitialized||!isCloudUser())return;cloudInitialized=true;await loadCloudData(false);if(cloudChannel)sb().removeChannel(cloudChannel);cloudChannel=sb().channel('dachwerk-live-sync').on('postgres_changes',{event:'*',schema:'public',table:'dachwerk_orders'},scheduleCloudRefresh).on('postgres_changes',{event:'*',schema:'public',table:'dachwerk_materials'},scheduleCloudRefresh).on('postgres_changes',{event:'*',schema:'public',table:'dachwerk_setup_items'},scheduleCloudRefresh).subscribe();};
function voiceInput(){if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){alert('Spracheingabe wird von diesem Browser nicht unterstützt.');return}let R=window.SpeechRecognition||window.webkitSpeechRecognition,r=new R();r.lang='de-DE';r.interimResults=false;r.onresult=e=>{$('arbeiten').value+=($('arbeiten').value?'\n':'')+e.results[0][0].transcript};r.start()}
function canvasSetup(id){let c=$(id),ctx=c.getContext('2d'),draw=false;function size(){const d=window.devicePixelRatio||1,w=c.clientWidth||420,h=160;const old=c.__signatureSource&&!c.__signatureDirty?c.__signatureSource:(()=>{try{return c.__signatureDirty?c.toDataURL('image/png'):null}catch(e){return null}})();c.width=Math.round(w*d);c.height=Math.round(h*d);c.__dpr=d;ctx.setTransform(d,0,0,d,0,0);ctx.lineWidth=2;ctx.strokeStyle='#174a83';ctx.lineCap='round';ctx.lineJoin='round';if(old){const img=new Image();img.onload=()=>{if(c.__signatureSource===old||c.__signatureDirty){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);ctx.setTransform(c.__dpr||1,0,0,c.__dpr||1,0,0)}};img.src=old}}size();let pos=e=>{let r=c.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};c.addEventListener('pointerdown',e=>{draw=true;c.__signatureDirty=true;c.__signatureSource=null;c.setPointerCapture(e.pointerId);let [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y)});c.addEventListener('pointermove',e=>{if(!draw)return;let[x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke()});['pointerup','pointercancel','pointerleave'].forEach(x=>c.addEventListener(x,()=>draw=false))}
function clearSig(id){let c=$(id),ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.setTransform(c.__dpr||1,0,0,c.__dpr||1,0,0);c.__signatureSource=null;c.__signatureDirty=false}
function loadSignature(id,data){const c=$(id);clearSig(id);if(!data)return;c.__signatureSource=data;c.__signatureDirty=false;const img=new Image();img.onload=()=>{if(c.__signatureSource!==data||c.__signatureDirty)return;const ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);ctx.setTransform(c.__dpr||1,0,0,c.__dpr||1,0,0);c.__signatureLoaded=true};img.onerror=()=>{console.warn('Unterschrift konnte nicht geladen werden:',id)};img.src=data}
function escPdf(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmtDate(v){if(!v)return '';let p=v.split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:v}
function sigData(id){let c=$(id);if(!c)return '';if(c.__signatureSource&&!c.__signatureDirty)return c.__signatureSource;try{return c.toDataURL('image/png')}catch(e){return ''}}
function pdfRows(items, names){
  return items.length ? items.map(x=>'<tr>'+names.map(n=>'<td>'+escPdf(x[n]||'')+'</td>').join('')+'</tr>').join('') : '<tr><td colspan="'+names.length+'" class="pdf-empty">Keine Positionen eingetragen.</td></tr>';
}
function createAndSendPDF(){
  let d=collect(), t=$('pdfTemplate');
  const sheet=t.querySelector('.pdf-sheet');
  const materialCount=(d.materials||[]).length, setupCount=(d.setup||[]).length;
  const employeeCount=(d.employees||[]).length, travelCount=(d.fahrtkosten||[]).length;
  const contentLength=String(d.arbeiten||'').length;
  sheet.classList.remove('pdf-dense','pdf-very-dense');
  if(materialCount+setupCount>=14 || contentLength>700 || employeeCount+travelCount+materialCount+setupCount>=25) sheet.classList.add('pdf-very-dense');
  else if(materialCount+setupCount>=8 || contentLength>350 || employeeCount+travelCount+materialCount+setupCount>=16) sheet.classList.add('pdf-dense');
  t.querySelector('[data-p="auftragsnr"]').textContent=d.auftragsnr||'';
  t.querySelector('[data-p="angebotsnr"]').textContent=d.angebotsnr||'';
  t.querySelector('[data-p="kunde"]').textContent=d.kunde||'';
  t.querySelector('[data-p="datum"]').textContent=fmtDate(d.datum);
  t.querySelector('[data-p="kontakt"]').textContent=d.kontakt||'';
  t.querySelector('[data-p="objekt"]').textContent=d.objekt||'';
  t.querySelector('[data-p="arbeiten"]').innerHTML=escPdf(d.arbeiten||'').replace(/\n/g,'<br>');
  let erows=d.employees||[];
  $('pdfEmployees').innerHTML=pdfRows(erows,['name','beg','end','pause','hours']);
  $('pdfEmployeeSum').textContent=erows.reduce((a,x)=>a+(parseFloat(String(x.hours||'0').replace(',','.'))||0),0).toFixed(2).replace('.',',')+' h';
  const travelRows=d.fahrtkosten||((d.fahrt?.kosten||d.fahrt?.km||d.fahrt?.hinweis)?[{datum:d.datum||'',betrag:d.fahrt?.kosten||'49.00'}]:[]);
  $('pdfFahrtRows').innerHTML=travelRows.length?travelRows.map(x=>'<tr><td>'+escPdf(fmtDate(x.datum))+'</td><td>'+escPdf(x.betrag!==''&&x.betrag!=null?Number(x.betrag).toFixed(2).replace('.',',')+' €':'')+'</td></tr>').join(''):'<tr><td colspan="2" class="pdf-empty">Keine Fahrtkosten eingetragen.</td></tr>';
  $('pdfFahrtSum').textContent=travelRows.reduce((a,x)=>a+(parseFloat(String(x.betrag||'0').replace(',','.'))||0),0).toFixed(2).replace('.',',')+' €';
  $('pdfSetup').innerHTML=pdfRows((d.setup||[]).map(x=>{let m=setups.find(z=>z.id===x.id);return {name:m?.name||(x.qty?'Freitext':''),qty:x.qty,unit:x.unit}}),['name','qty','unit']);
  $('pdfMaterial').innerHTML=pdfRows((d.materials||[]).map(x=>{let m=materials.find(z=>z.id===x.id);return {name:m?.name||(x.qty?'Freitext':''),qty:x.qty,unit:x.unit}}),['name','qty','unit']);
  $('pdfOrt').textContent=$('signOrt').value||'';
  $('pdfDatum2').textContent=fmtDate($('signDatum').value||d.datum);
  $('pdfSigKunde').src=sigData('sigKunde')||'';
  $('pdfSigFirma').src=sigData('sigFirma')||'';
  const pp=$('pdfPhotoPages');
  pp.innerHTML='';
  const pdfPhotos=d.photos||[];
  for(let start=0;start<pdfPhotos.length;start+=4){
    const page=document.createElement('div');
    page.className='pdf-photo-page';
    const pageNo=Math.floor(start/4)+1, pageCount=Math.ceil(pdfPhotos.length/4);
    page.innerHTML='<div class="pdf-photo-head"><img src="dachwerk-logo.jpg"><div><b>DACHWERK – BAUSTELLENFOTOS</b><br>Auftragsnummer: '+escPdf(d.auftragsnr||'')+'</div><div class="pdf-photo-count">Seite '+pageNo+' / '+pageCount+'</div></div><div class="pdf-photo-grid"></div>';
    const grid=page.querySelector('.pdf-photo-grid');
    pdfPhotos.slice(start,start+4).forEach((p,offset)=>{
      const item=document.createElement('div'); item.className='pdf-photo-item';
      const img=document.createElement('img'); img.src=p.src; img.alt='';
      const cap=document.createElement('div'); cap.className='pdf-photo-caption'; cap.textContent='Foto '+(start+offset+1)+' · '+(p.name||'Baustellenfoto');
      item.append(img,cap); grid.appendChild(item);
    });
    pp.appendChild(page);
  }
  // Wichtig für iOS Safari: Das PDF-Template liegt in der normalen App-Hülle.
  // Die Druck-CSS blendet diese Hülle aus. Deshalb das Template vorübergehend
  // direkt unter body verschieben, damit es beim Drucken nicht mit ausgeblendet wird.
  const originalParent=t.parentNode;
  const originalNext=t.nextSibling;
  document.body.appendChild(t);
  t.classList.add('printing');
  t.setAttribute('aria-hidden','false');
  const imgs=Array.from(t.querySelectorAll('img')).filter(img=>img.src);
  const waitForImage=img=>new Promise(resolve=>{
    if(img.complete && img.naturalWidth>0) return resolve();
    const done=()=>resolve();
    img.addEventListener('load',done,{once:true});
    img.addEventListener('error',done,{once:true});
    setTimeout(done,2500);
  });
  Promise.all(imgs.map(waitForImage)).then(()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      void t.offsetHeight;
      window.print();
    }));
  });
  const restorePdfTemplate=()=>{
    t.classList.remove('printing');
    t.setAttribute('aria-hidden','true');
    if(originalParent && t.parentNode===document.body){
      if(originalNext && originalNext.parentNode===originalParent) originalParent.insertBefore(t,originalNext);
      else originalParent.appendChild(t);
    }
  };
  window.addEventListener('afterprint',restorePdfTemplate,{once:true});
}

async function createBackup(){
  if(!isCloudUser()){alert('Bitte zuerst anmelden und auf die Benutzerfreigabe warten. Für ein vollständiges Backup muss Dachwerk mit Supabase verbunden sein.');return}
  if(typeof JSZip==='undefined'){alert('Die ZIP-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.');return}
  const button=[...document.querySelectorAll('.navbtn')].find(b=>b.textContent.trim()==='Backup erstellen');
  if(button){button.disabled=true;button.textContent='Backup wird erstellt …'}
  try{
    const client=sb();
    const [or,ma,se]=await Promise.all([
      client.from('dachwerk_orders').select('id,order_number,data,created_by,updated_at').order('updated_at',{ascending:false}),
      client.from('dachwerk_materials').select('*').order('material'),
      client.from('dachwerk_setup_items').select('*').order('bezeichnung')
    ]);
    for(const r of [or,ma,se])if(r.error)throw r.error;
    const zip=new JSZip();
    const backupOrders=[];
    for(const row of (or.data||[])){
      const data={...(row.data||{}),id:row.id,auftragsnr:row.order_number||row.data?.auftragsnr||''};
      data.photos=[];
      for(let i=0;i<(row.data?.photos||[]).length;i++){
        const photo={...(row.data.photos[i])};
        if(photo.path){
          const {data:urlData,error:urlError}=await client.storage.from('dachwerk-photos').createSignedUrl(photo.path,300);
          if(!urlError&&urlData?.signedUrl){
            try{const response=await fetch(urlData.signedUrl);if(response.ok){const blob=await response.blob();const ext=(blob.type||'image/jpeg').includes('png')?'png':'jpg';const fileName=`fotos/${row.id}/${String(i+1).padStart(2,'0')}-${(photo.name||'foto').replace(/[^a-z0-9._-]/gi,'_')}.${ext}`;zip.file(fileName,blob);photo.backupFile=fileName;}}
            catch(photoErr){console.warn('Foto konnte nicht ins Backup aufgenommen werden',photo.path,photoErr);}
          }
        } else if(photo.src&&photo.src.startsWith('data:image/')){
          const match=photo.src.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
          if(match){const ext=match[1]==='png'?'png':'jpg';const fileName=`fotos/${row.id}/${String(i+1).padStart(2,'0')}-${(photo.name||'foto').replace(/[^a-z0-9._-]/gi,'_')}.${ext}`;zip.file(fileName,match[2],{base64:true});photo.backupFile=fileName;}
        }
        delete photo.src;data.photos.push(photo);
      }
      backupOrders.push({id:row.id,order_number:row.order_number,created_by:row.created_by,updated_at:row.updated_at,data});
    }
    const manifest={format:'DACHWERK_BACKUP',version:1,createdAt:new Date().toISOString(),note:'JSON enthält Aufträge inklusive Unterschriften und Auftragsdaten. Fotos sind im Ordner fotos/ enthalten, sofern sie heruntergeladen werden konnten.',orders:backupOrders,materials:ma.data||[],setupItems:se.data||[]};
    zip.file('dachwerk-backup.json',JSON.stringify(manifest,null,2));
    zip.file('README.txt','DACHWERK Backup\n\nEnthält Aufträge, Unterschriften, Materialliste, Baustelleneinrichtung und herunterladbare Fotos.\nBewahre diese Datei sicher auf: Sie kann Kundendaten und Unterschriften enthalten.\nDieses Backup ist eine Datensicherung zur Aufbewahrung; ein automatischer Wiederherstellungsimport ist in dieser Funktion noch nicht enthalten.\n');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`DACHWERK_Backup_${new Date().toISOString().slice(0,10)}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    alert(`Backup erstellt. ${backupOrders.length} Aufträge, ${ma.data?.length||0} Materialien und ${se.data?.length||0} Baustelleneinrichtungen wurden exportiert. Bitte die ZIP-Datei sicher auf deinem Computer speichern.`);
  }catch(e){console.error('DACHWERK Backup fehlgeschlagen',e);alert('Backup fehlgeschlagen: '+(e?.message||'Unbekannter Fehler'));}
  finally{if(button){button.disabled=false;button.textContent='Backup erstellen'}}
}

window.addEventListener('load',()=>{canvasSetup('sigKunde');canvasSetup('sigFirma');resetForm();renderOrders();renderOffice();renderMasters();updateStorage()});

/* Tagesplan: responsive map view. Orders remain in Supabase; visibility preferences are device-local. */
let tagesplanMap=null,tagesplanMarkers=[],tagesplanRouteLine=null,tagesplanLocations=[],tagesplanSelected=[];
const TAGESPLAN_GEO_KEY='dw_tagesplan_geocodes_v2',TAGESPLAN_HIDDEN_KEY='dw_tagesplan_hidden_orders_v1';
function tagesplanHidden(){try{return JSON.parse(localStorage.getItem(TAGESPLAN_HIDDEN_KEY)||'[]')}catch{return []}}
function saveTagesplanHidden(ids){try{localStorage.setItem(TAGESPLAN_HIDDEN_KEY,JSON.stringify(ids))}catch(e){console.warn('Sichtbarkeit konnte nicht gespeichert werden',e)}}
function initTagesplan(){
 const date=$('tagesplanDate'),mapEl=$('tagesplanMap'),msg=$('tagesplanMessage');
 if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
 if(!mapEl)return;
 if(!window.L){if(msg)msg.textContent='Die Kartenbibliothek wurde nicht geladen. Prüfe die Internetverbindung und lade die App neu. Falls du die App als Home-Bildschirm-App nutzt, öffne sie einmal direkt im Browser.';return}
 mapEl.style.display='block';mapEl.style.width='100%';mapEl.style.height=window.innerWidth<700?'55vh':'min(62vh, 620px)';mapEl.style.minHeight='320px';
 if(!tagesplanMap){
  try{tagesplanMap=L.map(mapEl,{preferCanvas:true,zoomControl:true}).setView([51.1,9.1],8);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap-Mitwirkende',crossOrigin:true}).addTo(tagesplanMap)
    .on('tileerror',()=>{if(msg)msg.textContent='Die Karte ist gestartet, aber Kartenkacheln konnten nicht geladen werden. Prüfe Internetverbindung, Inhaltsblocker oder VPN.'});
  }catch(e){console.error('Tagesplan-Karte konnte nicht initialisiert werden',e);if(msg)msg.textContent='Karte konnte nicht gestartet werden: '+(e.message||'unbekannter Fehler');return}
 }
 const refreshSize=()=>{if(tagesplanMap){tagesplanMap.invalidateSize({pan:false});if(tagesplanMarkers.length){try{const visible=tagesplanLocations.filter(x=>x.marker&&tagesplanMap.hasLayer(x.marker));if(visible.length)tagesplanMap.fitBounds(L.featureGroup(visible.map(x=>x.marker)).getBounds().pad(.12),{maxZoom:13})}catch(e){}}}};
 requestAnimationFrame(refreshSize);setTimeout(refreshSize,250);setTimeout(refreshSize,800);renderTagesplanStops();
}
function tagesplanAddress(o){return String(o.objekt||'').trim()}
function tagesplanOrderLabel(o){return (o.auftragsnr||'Auftrag')+' · '+(o.kunde||'Ohne Auftraggeber')}
function tagesplanGeocodes(){try{return JSON.parse(localStorage.getItem(TAGESPLAN_GEO_KEY)||'{}')}catch{return {}}}
function tagesplanDistance(a,b){const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
async function loadTagesplanLocations(){
 initTagesplan();if(!window.L||!tagesplanMap)return;
 const btn=$('tagesplanLoadBtn');if(btn){btn.disabled=true;btn.textContent='Aufträge werden geladen …'}
 // Use the complete mirrored orders array, regardless of status; only records without an address cannot be pinned.
 const eligible=orders.filter(o=>tagesplanAddress(o)),geo=tagesplanGeocodes(),hidden=new Set(tagesplanHidden());tagesplanLocations=[];tagesplanSelected=[];
 tagesplanMarkers.forEach(m=>{try{tagesplanMap.removeLayer(m)}catch(e){}});tagesplanMarkers=[];
 if(tagesplanRouteLine){tagesplanMap.removeLayer(tagesplanRouteLine);tagesplanRouteLine=null}
 let hits=0,misses=0;
 try{
  for(let i=0;i<eligible.length;i++){
   const o=eligible[i],addr=tagesplanAddress(o);let point=geo[addr];
   if(!point){const msg=$('tagesplanMessage');if(msg)msg.textContent='Suche Kartenposition '+(i+1)+' von '+eligible.length+' …';
    try{const url='https://photon.komoot.io/api/?limit=1&q='+encodeURIComponent(addr+(addr.toLowerCase().includes('deutschland')?'':', Deutschland'));const res=await fetch(url);if(res.ok){const j=await res.json(),f=j.features&&j.features[0];if(f){point={lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],label:f.properties.name||addr};geo[addr]=point;try{localStorage.setItem(TAGESPLAN_GEO_KEY,JSON.stringify(geo))}catch(e){}}}}catch(e){console.warn('Geocoding fehlgeschlagen',addr,e)}
    await new Promise(resolve=>setTimeout(resolve,1050));
   }
   if(point&&Number.isFinite(Number(point.lat))&&Number.isFinite(Number(point.lng))){
    const item={id:String(o.id||o.auftragsnr||addr),order:o,lat:Number(point.lat),lng:Number(point.lng),address:addr,hidden:hidden.has(String(o.id||o.auftragsnr||addr)),marker:null};tagesplanLocations.push(item);
    const popup='<b>'+escapeTagesplan(tagesplanOrderLabel(o))+'</b><br>'+escapeTagesplan(addr)+'<br>'+(o.montage?.datum?escapeTagesplan(o.montage.datum):'Kein Termin')+'<br><button type="button" onclick="addTagesplanStop(&quot;'+escapeTagesplan(item.id)+'&quot;)">Stopp hinzufügen</button>';
    item.marker=L.marker([item.lat,item.lng]).bindPopup(popup);if(!item.hidden)item.marker.addTo(tagesplanMap);tagesplanMarkers.push(item.marker);hits++;
   }else{misses++;tagesplanLocations.push({id:String(o.id||o.auftragsnr||addr),order:o,address:addr,hidden:hidden.has(String(o.id||o.auftragsnr||addr)),missing:true})}
  }
  const visible=tagesplanLocations.filter(x=>!x.hidden&&!x.missing&&x.marker);
  if(visible.length){tagesplanMap.fitBounds(L.featureGroup(visible.map(x=>x.marker)).getBounds().pad(.12),{maxZoom:13})}else{tagesplanMap.setView([51.1,9.1],8)}
  const msg=$('tagesplanMessage');if(msg)msg.textContent='Aufträge mit Adresse: '+eligible.length+' · Kartenpositionen gefunden: '+hits+' · Ohne Kartenposition: '+misses+'. Alle Status werden berücksichtigt. Sichtbarkeit wird auf diesem Gerät gespeichert. Entfernungen sind Luftlinie.';
  renderTagesplanStops();
 }finally{if(btn){btn.disabled=false;btn.textContent='Baustellen laden'}}
}
function escapeTagesplan(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toggleTagesplanOrder(id,checked){const x=tagesplanLocations.find(v=>v.id===id);if(!x)return;x.hidden=!checked;const hidden=new Set(tagesplanHidden());if(checked)hidden.delete(id);else hidden.add(id);saveTagesplanHidden([...hidden]);if(x.marker&&tagesplanMap){if(checked)x.marker.addTo(tagesplanMap);else tagesplanMap.removeLayer(x.marker)}renderTagesplanStops();}
function setTagesplanAllVisible(visible){const hidden=new Set(tagesplanHidden());tagesplanLocations.forEach(x=>{x.hidden=!visible;if(visible)hidden.delete(x.id);else hidden.add(x.id);if(x.marker&&tagesplanMap){if(visible)x.marker.addTo(tagesplanMap);else tagesplanMap.removeLayer(x.marker)}});saveTagesplanHidden([...hidden]);if(visible){const shown=tagesplanLocations.filter(x=>!x.missing&&x.marker);if(shown.length)tagesplanMap.fitBounds(L.featureGroup(shown.map(x=>x.marker)).getBounds().pad(.12),{maxZoom:13})}renderTagesplanStops()}
function addTagesplanStop(id){if(!tagesplanSelected.includes(id)){tagesplanSelected.push(id);renderTagesplanStops()}if(tagesplanMap){const x=tagesplanLocations.find(v=>v.id===id);if(x&&!x.missing)tagesplanMap.setView([x.lat,x.lng],Math.max(tagesplanMap.getZoom(),12))}}
function removeTagesplanStop(id){tagesplanSelected=tagesplanSelected.filter(x=>x!==id);renderTagesplanStops()}
function clearTagesplanRoute(){tagesplanSelected=[];renderTagesplanStops()}
function renderTagesplanStops(){
 const box=$('tagesplanStops'),dist=$('tagesplanDistances');if(!box||!dist)return;box.innerHTML='';
 const query=String($('tagesplanSearch')?.value||'').trim().toLowerCase();const filtered=tagesplanLocations.filter(x=>!query||[tagesplanOrderLabel(x.order),x.address].join(' ').toLowerCase().includes(query));
 const count=$('tagesplanCount');if(count)count.textContent=filtered.length+' von '+tagesplanLocations.length+' Aufträgen · '+tagesplanLocations.filter(x=>!x.hidden&&!x.missing).length+' sichtbar auf der Karte';
 if(!tagesplanLocations.length)box.innerHTML='<p class="subtext">Noch keine Baustellen geladen. Tippe auf „Baustellen laden“.</p>';
 else filtered.forEach(x=>{const chosen=tagesplanSelected.includes(x.id),row=document.createElement('div');row.className='tagesplan-stop';row.innerHTML='<label class="tagesplan-visible"><input type="checkbox" '+(!x.hidden?'checked':'')+' onchange="toggleTagesplanOrder(&quot;'+escapeTagesplan(x.id)+'&quot;,this.checked)" '+(x.missing?'disabled':'')+'><span>Karte</span></label><div class="stop-info"><b>'+escapeTagesplan(tagesplanOrderLabel(x.order))+'</b><small>'+escapeTagesplan(x.address)+(x.missing?' · <b>Keine Kartenposition gefunden</b>':'')+'</small></div><div class="tagesplan-stop-actions">'+(chosen?'<button onclick="removeTagesplanStop(&quot;'+escapeTagesplan(x.id)+'&quot;)">Aus Route entfernen</button>':'<button '+(x.missing?'disabled':'')+' onclick="addTagesplanStop(&quot;'+escapeTagesplan(x.id)+'&quot;)">Stopp hinzufügen</button>')+'</div>';box.appendChild(row)});
 if(tagesplanRouteLine&&tagesplanMap){tagesplanMap.removeLayer(tagesplanRouteLine);tagesplanRouteLine=null}
 const selected=tagesplanSelected.map(id=>tagesplanLocations.find(x=>x.id===id)).filter(x=>x&&!x.missing&&!x.hidden);
 if(selected.length<2){dist.textContent=selected.length?'Wähle mindestens einen weiteren sichtbaren Stopp.':'Noch keine Stopps ausgewählt.';return}
 let lines=[],coords=[],total=0;for(let i=0;i<selected.length;i++){coords.push([selected[i].lat,selected[i].lng]);if(i>0){const km=tagesplanDistance(selected[i-1],selected[i]);total+=km;lines.push(i+'. '+tagesplanOrderLabel(selected[i-1].order)+' → '+tagesplanOrderLabel(selected[i].order)+': ca. '+km.toFixed(1).replace('.',',')+' km (Luftlinie)')}}
 if(tagesplanMap)tagesplanRouteLine=L.polyline(coords,{color:'#19734a',weight:4,dashArray:'8 7'}).addTo(tagesplanMap);dist.textContent=lines.join('\n')+'\n\nGesamte Luftlinie: ca. '+total.toFixed(1).replace('.',',')+' km';
}

