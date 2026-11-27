'use client'
import{useEffect,useMemo,useState}from'react'
import{trackEvent}from'../lib/analytics'
import{OWNER_EMAIL,persistOwnerTrustedSession,restoreOwnerTrustedSession}from'../lib/owner-session'

const U=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://buqtngevtujsylfqbjem.supabase.co'
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
const APP=typeof window==='undefined'?'https://transport-oou.vercel.app/admin':location.origin+'/admin'
const H=t=>({apikey:K,Authorization:'Bearer '+(t||K),'Content-Type':'application/json'})
const api=async(p,o={})=>{const r=await fetch(U+p,o);let b=null;try{b=await r.json()}catch{}if(!r.ok)throw Error(b?.message||b?.error_description||b?.hint||'Request failed');return b}
const fmt=t=>t?new Date(t).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'}):'—'
const authFeedback=(e)=>{const m=String(e?.message||'Authentication request failed');if(/signups not allowed for otp|otp_disabled/i.test(m))return 'Supabase is blocking new registrations. Enable “Allow new users to sign up” in Authentication → Sign In / Providers. Your 24-hour owner session begins after the first successful email verification.';if(/email address not authorized/i.test(m))return 'Supabase’s built-in mailer only delivers to authorized project-team addresses. Custom SMTP is required for OTP delivery to all users.';if(/rate limit|over_email_send_rate_limit/i.test(m))return 'OTP sending is rate-limited. Wait 60 seconds before retrying; the built-in Supabase mailer also has a low project-wide limit.';return m};
const tabs=['overview','analytics','operations','verification','operators','fleet','routes','trips','bookings','complaints','audit','admins']

export default function Admin(){
 const[session,setSession]=useState(null),[access,setAccess]=useState(null),[auth,setAuth]=useState(false),[sent,setSent]=useState(false),[email,setEmail]=useState(''),[otp,setOtp]=useState(''),[tab,setTab]=useState('overview'),[data,setData]=useState({profiles:[],operators:[],vehicles:[],routes:[],trips:[],bookings:[],complaints:[],audit:[],admins:[]}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[analytics,setAnalytics]=useState(null),[adminEmail,setAdminEmail]=useState(''),[adminRole,setAdminRole]=useState('sug'),[adminTitle,setAdminTitle]=useState('SUG Administrator')
 const toast=x=>{setMsg(x);clearTimeout(window.__adm);window.__adm=setTimeout(()=>setMsg(''),3500)}
 useEffect(()=>{const boot=async()=>{try{let s=JSON.parse(localStorage.getItem('toou_session')||'null');if(s?.user?.email?.toLowerCase()===OWNER_EMAIL){s=await restoreOwnerTrustedSession(api,K);if(s)localStorage.setItem('toou_session',JSON.stringify(s));else localStorage.removeItem('toou_session')}else if(!s?.access_token){s=await restoreOwnerTrustedSession(api,K);if(s)localStorage.setItem('toou_session',JSON.stringify(s))}if(s?.access_token){setSession(s);check(s.access_token,s.user?.id)}}catch(e){toast(e.message)}};boot()},[])
 useEffect(()=>{if(session?.access_token&&access){loadAll();if(tab==='analytics')loadAnalytics()}},[session,access,tab])
  async function check(tok,id){try{const a=await api('/rest/v1/admin_users?user_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=admin_role,title,active',{headers:H(tok)});if(a?.[0]){setAccess(a[0]);return}const me=await api('/auth/v1/user',{headers:H(tok)});if((me?.email||'').toLowerCase()==='fikayo009@gmail.com'){await api('/rest/v1/rpc/claim_owner_by_email',{method:'POST',headers:H(tok),body:'{}'});const owner=await api('/rest/v1/admin_users?user_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=admin_role,title,active',{headers:H(tok)});if(owner?.[0]){setAccess(owner[0]);return}}setAccess({denied:true})}catch{setAccess({denied:true})}}
 async function send(){setBusy(true);try{await api('/auth/v1/otp',{method:'POST',headers:H(),body:JSON.stringify({email:email.trim().toLowerCase(),create_user:email.trim().toLowerCase()===OWNER_EMAIL})});setSent(true);toast('Admin sign-in code sent')}catch(e){toast(e.message)}setBusy(false)}
 async function verify(){setBusy(true);try{const s=await api('/auth/v1/verify',{method:'POST',headers:H(),body:JSON.stringify({email,token:otp,type:'email'})});localStorage.setItem('toou_session',JSON.stringify(s));persistOwnerTrustedSession(s);setSession(s);await check(s.access_token,s.user.id);setSent(false);setAuth(false);toast('Signed in')}catch(e){toast(e.message)}setBusy(false)}
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
 async function loadAnalytics(){
   if(!session?.access_token)return
   try{
     const x=await api('/rest/v1/rpc/get_admin_analytics',{method:'POST',headers:H(session.access_token),body:JSON.stringify({p_days:7})})
     setAnalytics(x||null)
     trackEvent('admin_view',{metadata:{tab:'analytics'}})
   }catch(e){toast(e.message)}
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
 if(!session)return <Login email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} sent={sent} send={send} verify={verify} busy={busy} message={msg}/>
 if(access===null)return <div className="admin-login"><div className="admin-login-card"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><h1>Checking access…</h1><p>Securely checking your control-centre role.</p></div></div>
 if(access?.denied)return <div className="admin-denied"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><h1>Admin access is not assigned.</h1><p>This account is authenticated, but it is not on the Transport OOU owner/SUG administrator list.</p><button className="secondary" onClick={()=>{localStorage.removeItem('toou_session');localStorage.removeItem('toou_owner_trusted_session');location.reload()}}>Sign out</button></div>
 return <div className="admin-app">
  <header className="admin-header"><div className="admin-brand"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><span><b>CONTROL CENTRE</b><strong>{access.admin_role==='owner'?'OWNER':'SUG ADMIN'}</strong></span></div><div className="admin-user"><span>{access.title||'Administrator'}</span><button onClick={()=>{localStorage.removeItem('toou_session');localStorage.removeItem('toou_owner_trusted_session');location.href='/admin'}}>Sign out</button></div></header>
  <div className="admin-shell">
   <aside>{tabs.map(x=><button key={x} className={tab===x?'on':''} onClick={()=>setTab(x)}>{x}</button>)}<a href="/rider" title="Rider app" target="_blank">Passenger app ↗</a></aside>
   <main className="admin-main">
    <div className="admin-mobile-tabs">{tabs.map(x=><button key={x} className={tab===x?'on':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {tab==='overview'&&<Overview pending={pending.length} fleet={approvedFleet.length} dispatched={dispatched.length} live={liveFleet.length} trips={data.trips.length} bookings={data.bookings.length} complaints={data.complaints.filter(x=>x.status==='open').length} on={setTab}/>}
    {tab==='analytics'&&<AnalyticsPanel data={analytics} refresh={loadAnalytics} busy={busy}/>}{tab==='operations'&&<Operations rows={data.vehicles}/>}{tab==='verification'&&<Verification rows={pending} patch={patch}/>}
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


function Operations({rows}){
 const live=rows.filter(v=>v.status==='approved'&&v.gps_lat!=null&&v.gps_lng!=null)
 return <section><Head title="Live operations" text="Approved vehicles, current dispatch state and the latest GPS heartbeat."/>
  <div className="ops-grid">
   <div className="ops-map"><iframe title="OOU live operations map" src="https://www.openstreetmap.org/export/embed.html?bbox=3.84%2C6.89%2C3.96%2C6.98&layer=mapnik&marker=6.9388%2C3.9194"/></div>
   <div className="ops-list">{rows.filter(v=>v.status==='approved').slice(0,12).map(v=><article key={v.id} className="ops-card"><div><b>{v.fleet_code||v.plate_number}</b><small>{v.vehicle_type?.toUpperCase()} · {v.make_model||'Vehicle'} · {v.current_park||'Park not set'}</small></div><div className="ops-meta"><span className={v.gps_lat!=null?'live-dot':''}/><b>{v.available_for_dispatch?'AVAILABLE':'OFFLINE'}</b><small>{v.last_seen_at?new Date(v.last_seen_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}):'No GPS heartbeat'}</small></div></article>)}{!rows.length&&<Empty text="No fleet records yet."/>}</div>
  </div>
  <div className="admin-note"><b>GPS rule</b><p>"Live" means an approved vehicle has a recent location heartbeat. The map is intentionally kept as a simple OOU operations view until the final route corridor data is verified.</p></div>
 </section>
}

function AnalyticsPanel({data,refresh,busy}){
 const s=data?.summary||{},o=data?.operations||{},f=data?.funnel||[],d=data?.daily||[],r=data?.top_routes||[]
 const max=Math.max(1,...d.map(x=>Number(x.views||0)))
 const cards=[
  ['Page views',s.page_views||0],
  ['Unique visitors',s.unique_visitors||0],
  ['Bookings completed',s.booking_completed||0],
  ['Boardings verified',s.boarding_verified||0],
  ['Approved riders',o.approved_riders||0],
  ['GPS live',o.gps_live||0],
  ['Online fleet',o.online_fleet||0],
  ['Open complaints',o.open_complaints||0]
 ]
 return <section><div className="analytics-head"><Head title="Product analytics" text="Traffic, booking behaviour and live operations for the last 7 days."/><button className="admin-secondary" onClick={refresh} disabled={busy}>Refresh</button></div>
  <div className="analytics-cards">{cards.map(([label,n])=><div className="analytics-card" key={label}><span>{label}</span><strong>{n}</strong></div>)}</div>
  <div className="analytics-columns">
   <div className="analytics-panel"><div className="panel-title"><b>Daily activity</b><small>Page views and bookings</small></div><div className="daily-bars">{d.map(x=><div className="day-row" key={x.day}><span>{new Date(x.day).toLocaleDateString('en-NG',{weekday:'short'})}</span><div className="bar-track"><i style={{width:Math.max(2,(Number(x.views||0)/max)*100)+'%'}}/></div><b>{x.views||0}</b><em>{x.bookings||0} bookings</em></div>)}</div></div>
   <div className="analytics-panel"><div className="panel-title"><b>Top routes</b><small>By bookings</small></div>{r.slice(0,7).map((x,i)=><div className="rank-row" key={x.route}><span>{i+1}</span><div><b>{x.route}</b><small>{x.bookings} bookings</small></div></div>)}{!r.length&&<Empty text="Booking data will appear here."/>}</div>
  </div>
  <div className="analytics-panel"><div className="panel-title"><b>Passenger funnel</b><small>Session to completed booking</small></div><div className="funnel">{f.map((x,i)=>{const prev=Number(f[i-1]?.count||x.count||1);const pct=i?Math.min(100,Math.round((Number(x.count||0)/Math.max(1,prev))*100)):100;return <div className="funnel-row" key={x.event}><span>{x.event.replaceAll('_',' ')}</span><div className="bar-track"><i style={{width:Math.max(2,pct)+'%'}}/></div><b>{x.count||0}</b></div>})}</div></div>
  <div className="analytics-foot"><div><b>Platform monitoring</b><span>Vercel Web Analytics covers site traffic while Supabase Observability covers API, Auth, database and Realtime health.</span></div><div className="health-pills"><span>DB connected</span><span>RLS active</span><span>Analytics live</span></div></div>
 </section>
}

function Login(p){return <div className="admin-login"><div className="admin-login-card"><img src="/transport-oou-logo.svg" alt="Transport OOU"/><small>CONTROL CENTRE</small><h1>Transport OOU Admin</h1><p>Owner and approved SUG administrators sign in with their email. A verified owner device stays trusted for 24 hours; other accounts use email OTP.</p>{p.sent?<><input value={p.otp} onChange={e=>p.setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit verification code"/><button className="primary full" onClick={p.verify} disabled={p.busy}>{p.busy?'Verifying…':'Verify email'}</button></>:<><input type="email" value={p.email} onChange={e=>p.setEmail(e.target.value)} autoComplete="email" placeholder="Administrator email"/><button className="primary full" onClick={p.send} disabled={!p.email||p.busy}>{p.busy?'Sending…':'Send sign-in code'}</button></>}{p.message&&<div className="admin-login-message" role="status" style={{marginTop:12,padding:12,borderRadius:12,background:'#fff1f0',color:'#8a1c1c',fontSize:13,lineHeight:1.45}}>{p.message}</div>}<a href="/">← Passenger app</a></div></div>}
function Overview({pending,fleet,dispatched,live,trips,bookings,complaints,on}){const cards=[['Pending verification',pending,'verification'],['Approved fleet',fleet,'fleet'],['Available at park',dispatched,'fleet'],['Fleet GPS live',live,'operations'],['Trips',trips,'trips'],['Bookings',bookings,'bookings'],['Open complaints',complaints,'complaints']];return <section><div className="admin-hero"><div><small>TRANSPORT OOU CONTROL CENTRE</small><h1>Operate the network.</h1><p>Verify people, approve operators and vehicles, create trips, monitor bookings and resolve passenger issues.</p></div><div className="admin-live"><span/> Control systems online</div></div><div className="stat-grid">{cards.map(([label,n,to])=><button key={label} onClick={()=>on(to)}><span>{label}</span><strong>{n}</strong></button>)}</div><div className="admin-note"><b>Dispatch rule</b><p>A passenger does not choose a random bus. The operational system assigns an approved vehicle to a route, creates the trip and locks an exact seat to that trip.</p></div></section>}

function Verification({rows,patch}){return <section><Head title="Student verification" text="Confirm the identity records that unlock passenger booking."/><div className="admin-list">{rows.map(x=><article key={x.id} className="admin-row"><div><b>{x.full_name||'Unnamed student'}</b><small>{x.user_type} · Level {x.level||'—'} · {x.email||x.phone||'No contact'}</small><small>Matric: {x.matric_no||'—'} · JAMB: {x.jamb_reg_no||'—'}</small></div><div className="row-actions"><button onClick={()=>patch('profiles',x.id,{verification_status:'verified'},'verify_profile','profile')}>Verify</button><button className="danger" onClick={()=>patch('profiles',x.id,{verification_status:'suspended'},'suspend_profile','profile')}>Suspend</button></div></article>)}{!rows.length&&<Empty text="No pending profiles."/ >}</div></section>}

function Operators({rows,patch}){return <section><Head title="Riders / Operators" text="Approve drivers and review their requested vehicle before dispatch."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.operator_name}</b><small>{x.phone||'No phone'} · {x.requested_plate_number||'No plate'} · {x.requested_vehicle_type||'Vehicle type not supplied'}</small><small>{x.requested_make_model||'Model not supplied'} · {x.requested_vehicle_color||'Colour not supplied'} · Licence {x.driver_license_no||'Not supplied'}</small><span className={'status '+x.status}>{x.status}</span></div><div className="row-actions">{x.status!=='approved'&&<button onClick={()=>patch('operators',x.id,{status:'approved'},'approve_operator','operator')}>Approve</button>}{x.status!=='suspended'&&<button className="danger" onClick={()=>patch('operators',x.id,{status:'suspended'},'suspend_operator','operator')}>Suspend</button>}</div></article>)}</div></section>}

function Fleet({rows,patch}){return <section><Head title="Fleet" text="Approve vehicles, assign them to the park and control dispatch availability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.fleet_code||'Uncoded vehicle'} · {x.plate_number}</b><small>{x.vehicle_type} · {x.make_model||'Vehicle model not set'} · {x.seat_capacity} seats</small><small>Park: {x.current_park||'—'} · GPS: {x.gps_lat?x.gps_lat.toFixed(5)+' / '+x.gps_lng.toFixed(5):'Offline'}</small><span className={'status '+x.status}>{x.status}</span></div><div className="row-actions"><button onClick={()=>patch('vehicles',x.id,{status:'approved'},'approve_vehicle','vehicle')}>Approve</button><button onClick={()=>patch('vehicles',x.id,{current_park:'School Park',available_for_dispatch:true},'put_vehicle_at_school_park','vehicle')}>At School Park</button><button className="danger" onClick={()=>patch('vehicles',x.id,{status:'suspended',available_for_dispatch:false},'suspend_vehicle','vehicle')}>Suspend</button></div></article>)}</div></section>}

function Routes({rows,patch}){return <section><Head title="Routes" text="Control the public transport network and fares."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.origin} → {x.destination}</b><small>{x.name}</small></div><div className="row-actions"><span className="fare">₦{Number(x.fare).toLocaleString()}</span><button onClick={()=>patch('routes',x.id,{active:!x.active},x.active?'pause_route':'activate_route','route')}>{x.active?'Pause':'Activate'}</button></div></article>)}</div></section>}

function Trips({rows,routes,vehicles,createTrip}){const[route,setRoute]=useState(routes[0]?.id||''),[vehicle,setVehicle]=useState(vehicles[0]?.id||''),[when,setWhen]=useState('');return <section><Head title="Trips & dispatch" text="Create a specific trip against a verified vehicle. The trip gets its own seat inventory."/><div className="admin-card form-grid"><label>Route<select value={route} onChange={e=>setRoute(e.target.value)}>{routes.filter(x=>x.active).map(x=><option value={x.id} key={x.id}>{x.origin} → {x.destination}</option>)}</select></label><label>Vehicle<select value={vehicle} onChange={e=>setVehicle(e.target.value)}>{vehicles.map(x=><option value={x.id} key={x.id}>{x.fleet_code} · {x.plate_number}</option>)}</select></label><label>Departure<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><button className="primary" disabled={!route||!vehicle||!when} onClick={()=>createTrip(route,vehicle,when)}>Create trip</button></div><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>Trip {x.id.slice(0,8)}</b><small>{x.route_id} · {x.vehicle_id}</small><small>{fmt(x.departure_at)} · {x.status}</small></div><span className={'status '+x.status}>{x.status}</span></article>)}</div></section>}

function Bookings({rows,profiles,trips,patch}){const pname=id=>profiles.find(x=>x.id===id)?.full_name||id?.slice(0,8);return <section><Head title="Bookings" text="Audit passenger reservations and boarding states."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.booking_code} · {pname(x.student_id)}</b><small>Trip {x.trip_id?.slice(0,8)} · Seat {x.seat_id?.slice(0,8)}</small><small>Booked {fmt(x.booked_at)} · {x.status}</small></div><div className="row-actions"><button onClick={()=>patch('bookings',x.id,{status:'boarded',boarded_at:new Date().toISOString()},'mark_boarded','booking')}>Boarded</button><button onClick={()=>patch('bookings',x.id,{status:'no_show'},'mark_no_show','booking')}>No-show</button><button className="danger" onClick={()=>patch('bookings',x.id,{status:'cancelled'},'cancel_booking','booking')}>Cancel</button></div></article>)}</div></section>}

function Complaints({rows,patch}){return <section><Head title="Complaints" text="Track passenger issues with operational accountability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.reference} · {x.category}</b><small>{x.message}</small><small>{fmt(x.created_at)}</small></div><div className="row-actions"><button onClick={()=>patch('complaints',x.id,{status:'investigating'},'investigate_complaint','complaint')}>Investigate</button><button onClick={()=>patch('complaints',x.id,{status:'resolved'},'resolve_complaint','complaint')}>Resolve</button><button className="danger" onClick={()=>patch('complaints',x.id,{status:'rejected'},'reject_complaint','complaint')}>Reject</button></div></article>)}</div></section>}

function Audit({rows}){return <section><Head title="Audit log" text="Administrative actions recorded for accountability."/><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.id}><div><b>{x.action}</b><small>{x.actor_role} · {x.entity_type} · {x.entity_id||'—'}</small><small>{fmt(x.created_at)}</small></div><code>{JSON.stringify(x.details)}</code></article>)}</div></section>}

function Admins({rows,email,setEmail,role,setRole,title,setTitle,grant,owner,patch}){return <section><Head title="Administrators" text="Owner-controlled access for you and SUG."/><div className="admin-card form-grid"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Their authenticated email"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="sug">SUG administrator</option></select></label><label>Title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><button className="primary" disabled={!owner||!email} onClick={grant}>Grant access</button></div><div className="admin-list">{rows.map(x=><article className="admin-row" key={x.user_id}><div><b>{x.title||'Administrator'}</b><small>{x.user_id}</small></div><div className="row-actions"><span className={'status '+(x.active?'approved':'suspended')}>{x.admin_role} · {x.active?'active':'inactive'}</span></div></article>)}</div></section>}

function Head({title,text}){return <div className="section-head"><div><small>CONTROL CENTRE</small><h2>{title}</h2><p>{text}</p></div></div>}
function Empty({text}){return <div className="empty">{text}</div>}
