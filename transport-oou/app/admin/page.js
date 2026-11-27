'use client'
import{useEffect,useMemo,useState}from'react'

const U=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://buqtngevtujsylfqbjem.supabase.co'
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
const APP=typeof window==='undefined'?'https://transport-oou.vercel.app/admin':location.origin+'/admin'
const H=t=>({apikey:K,Authorization:'Bearer '+(t||K),'Content-Type':'application/json'})
const api=async(p,o={})=>{const r=await fetch(U+p,o);let b=null;try{b=await r.json()}catch{}if(!r.ok)throw Error(b?.message||b?.error_description||b?.hint||'Request failed');return b}
const fmt=t=>t?new Date(t).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'}):'—'
const tabs=['overview','verification','operators','fleet','routes','trips','bookings','complaints','audit','admins']

export default function Admin(){
 const[session,setSession]=useState(null),[access,setAccess]=useState(null),[auth,setAuth]=useState(false),[sent,setSent]=useState(false),[email,setEmail]=useState(''),[otp,setOtp]=useState(''),[tab,setTab]=useState('overview'),[data,setData]=useState({profiles:[],operators:[],vehicles:[],routes:[],trips:[],bookings:[],complaints:[],audit:[],admins:[]}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[adminEmail,setAdminEmail]=useState(''),[adminRole,setAdminRole]=useState('sug'),[adminTitle,setAdminTitle]=useState('SUG Administrator')
 const toast=x=>{setMsg(x);clearTimeout(window.__adm);window.__adm=setTimeout(()=>setMsg(''),3500)}
 useEffect(()=>{try{const s=JSON.parse(localStorage.getItem('toou_session')||'null');if(s?.access_token){setSession(s);check(s.access_token,s.user?.id)}}catch{}},[])
 useEffect(()=>{if(session?.access_token&&access)loadAll()},[session,access,tab])
  async function check(tok,id){try{const a=await api('/rest/v1/admin_users?user_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=admin_role,title,active',{headers:H(tok)});if(a?.[0]){setAccess(a[0]);return}const me=await api('/auth/v1/user',{headers:H(tok)});if((me?.email||'').toLowerCase()==='fikayo009@gmail.com'){await api('/rest/v1/rpc/claim_owner_by_email',{method:'POST',headers:H(tok),body:'{}'});const owner=await api('/rest/v1/admin_users?user_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=admin_role,title,active',{headers:H(tok)});if(owner?.[0]){setAccess(owner[0]);return}}setAccess({denied:true})}catch{setAccess({denied:true})}}
 async function send(){setBusy(true);try{await api('/auth/v1/otp',{method:'POST',headers:H(),body:JSON.stringify({email:email.trim().toLowerCase(),create_user:false})});setSent(true);toast('Admin sign-in code sent')}catch(e){toast(e.message)}setBusy(false)}
 async function verify(){setBusy(true);try{const s=await api('/auth/v1/verify',{method:'POST',headers:H(),body:JSON.stringify({email,token:otp,type:'email'})});localStorage.setItem('toou_session',JSON.stringify(s));setSession(s);await check(s.access_token,s.user.id);setSent(false);setAuth(false);toast('Signed in')}catch(e){toast(e.message)}setBusy(false)}
 async function loadAll(){
   const t=session?.access_token;if(!t)return
   setBusy(true)
   const get=async q=>{try{return await api(q,{headers:H(t)})}catch{return[]}}
   const [profiles,operators,vehicles,routes,trips,bookings,complaints,audit,admins]=await Promise.all([
    get('/rest/v1/profiles?select=id,full_name,email,phone,user_type,level,matric_no,jamb_reg_no,verification_status,created_at&order=created_at.desc&limit=150'),
    get('/rest/v1/operators?select=id,operator_name,phone,status,user_id,created_at&order=created_at.desc&limit=150'),
    get('/rest/v1/vehicles?select=id,operator_id,fleet_code,plate_number,vehicle_type,make_model,seat_capacity,status,verification_expires_at,current_park,available_for_dispatch,gps_lat,gps_lng,last_seen_at&order=created_at.desc&limit=150'),
    get('/rest/v1/routes?select=id,name,origin,destination,fare,active,origin_lat,origin_lng,destination_lat,destination_lng&order=destination.asc'),
    get('/rest/v1/trips?select=id,route_id,vehicle_id,departure_at,status,created_at&order=departure_at.desc&limit=150'),
    get('/rest/v1/bookings?select=id,booking_code,trip_id,seat_id,student_id,status,booked_at,boarded_at&order=booked_at.desc&limit=200'),
    get('/rest/v1/complaints?select=id,student_id,booking_id,category,message,status,reference,created_at&order=created_at.desc&limit=150'),
    get('/rest/v1/admin_audit_logs?select=id,actor_id,actor_role,action,entity_type,entity_id,details,created_at&order=created_at.desc&limit=200'),
    get('/rest/v1/admin_users?select=user_id,title,active,admin_role')
   ])
   setData({profiles,operators,vehicles,routes,trips,bookings,complaints,audit,admins});setBusy(false)
 }
 async function patch(table,id,payload,action,type){
   if(!session?.access_token)return
   setBusy(true)
   try{
    await api('/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{...H(session.access_token),Prefer:'return=minimal'},body:JSON.stringify(payload)})
    await api('/rest/v1/admin_audit_logs',{method:'POST',headers:{...H(session.access_token),Prefer:'return=minimal'},body:JSON.stringify({actor_id:session.user.id,actor_role:access.admin_role,action,entity_type:type,entity_id:id,details:payload})})
    await loadAll();toast('Action completed')
   }catch(e){toast(e.message)}setBusy(false)
 }
 async function createTrip(routeId,vehicleId,when){
  setBusy(true);try{await api('/rest/v1/rpc/create_trip',{method:'POST',headers:H(session.access_token),body:JSON.stringify({p_route_id:routeId,p_vehicle_id:vehicleId,p_departure_at:new Date(when).toISOString()})});await loadAll();toast('Trip created and seats allocated')}catch(e){toast(e.message)}setBusy(false)
 }
 async function grantAdmin(){
  if(access?.admin_role!=='owner'){toast('Owner access required');return}
  setBusy(true);try{await api('/rest/v1/rpc/grant_admin_access',{method:'POST',headers:H(session.access_token),body:JSON.stringify({p_email:adminEmail,p_admin_role:adminRole,p_title:adminTitle})});await loadAll();toast('Admin access granted')}catch(e){toast(e.message)}setBusy(false)
 }
 const pending=data.profiles.filter(x=>x.verification_status==='pending')
 const approvedFleet=data.vehicles.filter(x=>x.status==='approved')
 const dispatched=data.vehicles.filter(x=>x.available_for_dispatch)
 const liveFleet=data.vehicles.filter(x=>x.gps_lat&&x.gps_lng&&x.status==='approved')
 if(!session)return <Login email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} sent={sent} send={send} verify={verify} busy={busy}/>
 if(access===null)return <div className="admin-login"><div className="admin-login-card"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><h1>Checking access…</h1><p>Securely checking your control-centre role.</p></div></div>
 if(access?.denied)return <div className="admin-denied"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><h1>Admin access is not assigned.</h1><p>This account is authenticated, but it is not on the Transport OOU owner/SUG administrator list.</p><button className="secondary" onClick={()=>{localStorage.removeItem('toou_session');location.reload()}}>Sign out</button></div>
 return <div className="admin-app">
  <header className="admin-header"><div className="admin-brand"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><span><b>CONTROL CENTRE</b><strong>{access.admin_role==='owner'?'OWNER':'SUG ADMIN'}</strong></span></div><div className="admin-user"><span>{access.title||'Administrator'}</span><button onClick={()=>{localStorage.removeItem('toou_session');location.href='/admin'}}>Sign out</button></div></header>
  <div className="admin-shell">
   <aside>{tabs.map(x=><button key={x} className={tab===x?'on':''} onClick={()=>setTab(x)}>{x}</button>)}<a href="/" target="_blank">Passenger app ↗</a></aside>
   <main className="admin-main">
    <div className="admin-mobile-tabs">{tabs.map(x=><button key={x} className={tab===x?'on':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {tab==='overview'&&<Overview pending={pending.length} fleet={approvedFleet.length} dispatched={dispatched.length} live={liveFleet.length} trips={data.trips.length} bookings={data.bookings.length} complaints={data.complaints.filter(x=>x.status==='open').length} on={setTab}/>}
    {tab==='verification'&&<Verification rows={pending} patch={patch}/>}
    {tab==='operators'&&<Operators rows={data.operators} patch={patch}/>}
    {tab==='fleet'&&<Fleet rows={data.vehicles} patch={patch}/>}
    {tab==='routes'&&<Routes rows={data.routes} patch={patch}/>}
    {tab==='trips'&&<Trips rows={data.trips} routes={data.routes} vehicles={approvedFleet} createTrip={createTrip}/>}
    {tab==='bookings'&&<Bookings rows={data.bookings} profiles={data.profiles} trips={data.trips} patch={patch}/>}
    {tab==='complaints'&&<Complaints rows={data.complaints} patch={patch}/>}
    {tab==='audit'&&<Audit rows={data.audit}/>}
    {tab==='admins'&&<Admins rows={data.admins} email={adminEmail} setEmail={setAdminEmail} role={adminRole} setRole={setAdminRole} title={adminTitle} setTitle={setAdminTitle} grant={grantAdmin} owner={access.admin_role==='owner'} patch={patch}/>}
   </main>
  </div>
  {busy&&<div className="admin-loading">Syncing control centre…</div>}{msg&&<div className="toast">{msg}</div>}
 </div>
}

function Login(p){return <div className="admin-login"><div className="admin-login-card"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><small>CONTROL CENTRE</small><h1>Transport OOU Admin</h1><p>Owner and approved SUG administrators sign in with their email. No passenger/OOU verification workflow is required here.</p>{p.sent?<><input value={p.otp} onChange={e=>p.setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit verification code"/><button className="primary full" onClick={p.verify} disabled={p.busy}>Verify email</button></>:<><input type="email" value={p.email} onChange={e=>p.setEmail(e.target.value)} autoComplete="email" placeholder="Administrator email"/><button className="primary full" onClick={p.send} disabled={!p.email||p.busy}>Send sign-in code</button></>}<a href="/">← Passenger app</a></div></div>}
function Overview({pending,fleet,dispatched,live,trips,bookings,complaints,on}){const cards=[['Pending verification',pending,'verification'],['Approved fleet',fleet,'fleet'],['Available at park',dispatched,'fleet'],['Fleet GPS live',live,'map'],['Trips',trips,'trips'],['Bookings',bookings,'bookings'],['Open complaints',complaints,'complaints']];return <section><div className="admin-hero"><div><small>TRANSPORT OOU CONTROL CENTRE</small><h1>Operate the network.</h1><p>Verify people, approve operators and vehicles, create trips, monitor bookings and resolve passenger issues.</p></div><div className="admin-live"><span/> Control systems online</div></div><div className="stat-grid">{cards.map(([label,n,to])=><button key={label} onClick={()=>on(to)}><span>{label}</span><strong>{n}</strong></button>)}</div><div className="admin-note"><b>Dispatch rule</b><p>A passenger does not choose a random bus. The operational system assigns an approved vehicle to a route, creates the trip and locks an exact seat to that trip.</p></div></section>}

function Verification({rows,patch}){return <section><Head title="Student verification" text="Confirm the identity records that unlock passenger booking."/><div className="admin-list">{rows.map(x=><article key={x.id} className="admin-row"><div><b>{x.full_name||'Unnamed student'}</b><small>{x.user_type} · Level {x.level||'—'} · {x.email||x.phone||'No contact'}</small><small>Matric: {x.matric_no||'—'} · JAMB: {x.jamb_reg_no||'—'}</small></div><div className="row-actions"><button onClick={()=>patch('profiles',x.id,{verification_status:'verified'},'verify_profile','profile')}>Verify</button><button className="danger" onClick={()=>patch('profiles',x.id,{verification_status:'suspended'},'suspend_profile','profile')}>Suspend</button></div></article>)}{!rows.length&&<Empty text="No pending profiles."/ >}</div></section>}

function Operators({rows,patch}){return <section><Head title="Operators" text="Approve and suspend transport operators."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.operator_name}</b><small>{x.phone||'No phone'} · User {x.user_id}</small><span className={'status '+x.status}>{x.status}</span></div><div className="row-actions">{x.status!=='approved'&&<button onClick={()=>patch('operators',x.id,{status:'approved'},'approve_operator','operator')}>Approve</button>}{x.status!=='suspended'&&<button className="danger" onClick={()=>patch('operators',x.id,{status:'suspended'},'suspend_operator','operator')}>Suspend</button>}</div></article>)}</div></section>}

function Fleet({rows,patch}){return <section><Head title="Fleet" text="Approve vehicles, assign them to the park and control dispatch availability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.fleet_code||'Uncoded vehicle'} · {x.plate_number}</b><small>{x.vehicle_type} · {x.make_model||'Vehicle model not set'} · {x.seat_capacity} seats</small><small>Park: {x.current_park||'—'} · GPS: {x.gps_lat?x.gps_lat.toFixed(5)+' / '+x.gps_lng.toFixed(5):'Offline'}</small><span className={'status '+x.status}>{x.status}</span></div><div className="row-actions"><button onClick={()=>patch('vehicles',x.id,{status:'approved'},'approve_vehicle','vehicle')}>Approve</button><button onClick={()=>patch('vehicles',x.id,{current_park:'School Park',available_for_dispatch:true},'put_vehicle_at_school_park','vehicle')}>At School Park</button><button className="danger" onClick={()=>patch('vehicles',x.id,{status:'suspended',available_for_dispatch:false},'suspend_vehicle','vehicle')}>Suspend</button></div></article>)}</div></section>}

function Routes({rows,patch}){return <section><Head title="Routes" text="Control the public transport network and fares."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.origin} → {x.destination}</b><small>{x.name}</small></div><div className="row-actions"><span className="fare">₦{Number(x.fare).toLocaleString()}</span><button onClick={()=>patch('routes',x.id,{active:!x.active},x.active?'pause_route':'activate_route','route')}>{x.active?'Pause':'Activate'}</button></div></article>)}</div></section>}

function Trips({rows,routes,vehicles,createTrip}){const[route,setRoute]=useState(routes[0]?.id||''),[vehicle,setVehicle]=useState(vehicles[0]?.id||''),[when,setWhen]=useState('');return <section><Head title="Trips & dispatch" text="Create a specific trip against a verified vehicle. The trip gets its own seat inventory."/><div className="admin-card form-grid"><label>Route<select value={route} onChange={e=>setRoute(e.target.value)}>{routes.filter(x=>x.active).map(x=><option value={x.id} key={x.id}>{x.origin} → {x.destination}</option>)}</select></label><label>Vehicle<select value={vehicle} onChange={e=>setVehicle(e.target.value)}>{vehicles.map(x=><option value={x.id} key={x.id}>{x.fleet_code} · {x.plate_number}</option>)}</select></label><label>Departure<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><button className="primary" disabled={!route||!vehicle||!when} onClick={()=>createTrip(route,vehicle,when)}>Create trip</button></div><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>Trip {x.id.slice(0,8)}</b><small>{x.route_id} · {x.vehicle_id}</small><small>{fmt(x.departure_at)} · {x.status}</small></div><span className={'status '+x.status}>{x.status}</span></article>)}</div></section>}

function Bookings({rows,profiles,trips,patch}){const pname=id=>profiles.find(x=>x.id===id)?.full_name||id?.slice(0,8);return <section><Head title="Bookings" text="Audit passenger reservations and boarding states."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.booking_code} · {pname(x.student_id)}</b><small>Trip {x.trip_id?.slice(0,8)} · Seat {x.seat_id?.slice(0,8)}</small><small>Booked {fmt(x.booked_at)} · {x.status}</small></div><div className="row-actions"><button onClick={()=>patch('bookings',x.id,{status:'boarded',boarded_at:new Date().toISOString()},'mark_boarded','booking')}>Boarded</button><button onClick={()=>patch('bookings',x.id,{status:'no_show'},'mark_no_show','booking')}>No-show</button><button className="danger" onClick={()=>patch('bookings',x.id,{status:'cancelled'},'cancel_booking','booking')}>Cancel</button></div></article>)}</div></section>}

function Complaints({rows,patch}){return <section><Head title="Complaints" text="Track passenger issues with operational accountability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.reference} · {x.category}</b><small>{x.message}</small><small>{fmt(x.created_at)}</small></div><div className="row-actions"><button onClick={()=>patch('complaints',x.id,{status:'investigating'},'investigate_complaint','complaint')}>Investigate</button><button onClick={()=>patch('complaints',x.id,{status:'resolved'},'resolve_complaint','complaint')}>Resolve</button><button className="danger" onClick={()=>patch('complaints',x.id,{status:'rejected'},'reject_complaint','complaint')}>Reject</button></div></article>)}</div></section>}

function Audit({rows}){return <section><Head title="Audit log" text="Administrative actions recorded for accountability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.action}</b><small>{x.actor_role} · {x.entity_type} · {x.entity_id||'—'}</small><small>{fmt(x.created_at)}</small></div><code>{JSON.stringify(x.details)}</code></article>)}</div></section>}

function Admins({rows,email,setEmail,role,setRole,title,setTitle,grant,owner,patch}){return <section><Head title="Administrators" text="Owner-controlled access for you and SUG."/><div className="admin-card form-grid"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Their authenticated email"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="sug">SUG administrator</option><option value="owner">Owner</option></select></label><label>Title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><button className="primary" disabled={!owner||!email} onClick={grant}>Grant access</button></div><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.user_id}><div><b>{x.title||'Administrator'}</b><small>{x.user_id}</small></div><div className="row-actions"><span className={'status '+(x.active?'approved':'suspended')}>{x.admin_role} · {x.active?'active':'inactive'}</span></div></article>)}</div></section>}

function Head({title,text}){return <div className="section-head"><div><small>CONTROL CENTRE</small><h2>{title}</h2><p>{text}</p></div></div>}
function Empty({text}){return <div className="empty">{text}</div>}
