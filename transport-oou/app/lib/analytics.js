'use client'
import{useEffect}from'react'
import{usePathname}from'next/navigation'

const U=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://buqtngevtujsylfqbjem.supabase.co'
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''

function sessionId(){
 if(typeof window==='undefined')return''
 let id=localStorage.getItem('toou_analytics_session')
 if(!id){id=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('toou_analytics_session',id)}
 return id
}
function roleFromPath(){
 if(typeof window==='undefined')return'visitor'
 const p=location.pathname
 if(p.startsWith('/admin'))return'admin'
 if(p.startsWith('/rider'))return'rider'
 try{const s=JSON.parse(localStorage.getItem('toou_session')||'null');if(s?.access_token)return'student'}catch{}
 return'visitor'
}
export async function trackEvent(event,{page,routeId,tripId,metadata}={}){ 
 if(typeof window==='undefined'||!K)return false
 try{
  const res=await fetch(U+'/rest/v1/rpc/track_analytics_event',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({p_event_name:event,p_page:page||location.pathname,p_session_id:sessionId(),p_role:roleFromPath(),p_route_id:routeId||null,p_trip_id:tripId||null,p_metadata:metadata||{}}),keepalive:true})
  return res.ok
 }catch{return false}
}
export default function AnalyticsTracker(){
 const pathname=usePathname()
 useEffect(()=>{
  const started=localStorage.getItem('toou_analytics_started')
  if(!started){localStorage.setItem('toou_analytics_started','1');trackEvent('session_start',{page:pathname})}
  trackEvent('page_view',{page:pathname})
 },[pathname])
 return null
}
