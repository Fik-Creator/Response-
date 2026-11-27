'use client';

import {useEffect,useState} from 'react';
import {persistOwnerTrustedSession} from '../../lib/owner-session';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://buqtngevtujsylfqbjem.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

const destinations={
  passenger:{path:'/',storage:'toou_session'},
  rider:{path:'/rider',storage:'toou_rider_session'},
  admin:{path:'/admin',storage:'toou_session'}
};

async function request(path,options={}) {
  const response=await fetch(SUPABASE_URL+path,{
    ...options,
    cache:'no-store',
    headers:{
      apikey:SUPABASE_KEY,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(body?.msg||body?.message||body?.error_description||body?.error||'Email confirmation could not be completed.');
  return body;
}

export default function AuthCallbackPage(){
  const [message,setMessage]=useState('Confirming your email and securely opening Transport OOU…');

  useEffect(()=>{
    let active=true;
    const finish=async()=>{
      try{
        const query=new URLSearchParams(window.location.search);
        const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
        const appKey=destinations[query.get('app')]?query.get('app'):'passenger';
        const destination=destinations[appKey];

        const linkError=hash.get('error_description')||query.get('error_description')||query.get('error');
        if(linkError)throw new Error(linkError.replace(/\+/g,' '));

        let session=null;
        const tokenHash=query.get('token_hash');
        if(tokenHash){
          const type=query.get('type')||'email';
          session=await request('/auth/v1/verify',{
            method:'POST',
            body:JSON.stringify({token_hash:tokenHash,type})
          });
        }else{
          const accessToken=hash.get('access_token');
          const refreshToken=hash.get('refresh_token');
          if(!accessToken||!refreshToken){
            throw new Error('This email link is incomplete or expired. Return to the app and request a fresh code.');
          }
          const expiresIn=Number(hash.get('expires_in')||3600);
          session={
            access_token:accessToken,
            refresh_token:refreshToken,
            token_type:hash.get('token_type')||'bearer',
            expires_in:expiresIn,
            expires_at:Number(hash.get('expires_at')||Math.floor(Date.now()/1000)+expiresIn)
          };
          session.user=await request('/auth/v1/user',{
            headers:{Authorization:'Bearer '+accessToken}
          });
        }

        if(!session?.access_token||!session?.user?.id){
          throw new Error('Supabase confirmed the link but did not return a complete session. Please request a new code.');
        }

        window.localStorage.setItem(destination.storage,JSON.stringify(session));
        persistOwnerTrustedSession(session);

        if(active){
          setMessage('Email verified. Opening '+(appKey==='admin'?'the Control Centre':appKey==='rider'?'the Rider App':'the Passenger App')+'…');
          window.location.replace(destination.path);
        }
      }catch(error){
        if(active)setMessage(error?.message||'Verification failed. Return to the app and request a new email.');
      }
    };
    finish();
    return()=>{active=false};
  },[]);

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#07182f',color:'#fff',fontFamily:'Arial,sans-serif'}}>
    <section style={{width:'min(100%,480px)',padding:32,borderRadius:24,background:'#102849',border:'1px solid #284565',textAlign:'center',boxShadow:'0 24px 70px rgba(0,0,0,.25)'}}>
      <div style={{fontSize:12,letterSpacing:3,fontWeight:800,color:'#ffd21a'}}>TRANSPORT OOU</div>
      <h1 style={{fontSize:26,margin:'18px 0 12px'}}>Secure email verification</h1>
      <p style={{color:'#d5e2f1',lineHeight:1.6,overflowWrap:'anywhere'}}>{message}</p>
      <a href="/" style={{display:'inline-block',marginTop:18,color:'#ffd21a',fontWeight:700}}>Return to Passenger App</a>
    </section>
  </main>;
}
