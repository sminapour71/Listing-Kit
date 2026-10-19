'use client';
import { useEffect, useState } from 'react';
import Wordmark from './wordmark';
import { safeReturnPath } from '../lib/auth-options';
type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';
export default function AccountForm({ mode, next = '/', linkError = false }: { mode: Mode; next?: string; linkError?: boolean }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[destination,setDestination]=useState(safeReturnPath(next));
  useEffect(()=>{if(next==='/' && window.location.hash)setDestination(safeReturnPath('/'+window.location.hash));},[next]);
  const titles = {'sign-in':'Welcome back.','sign-up':'Your next chapter starts here.','forgot-password':'Let’s get you back in.','reset-password':'A fresh start.'};
  const descriptions={'sign-in':'Sign in to your Listory workspace.','sign-up':'Create your agent account to manage your listings securely.','forgot-password':'We’ll send a link to reset your password.','reset-password':'Choose a new password for your account.'};
  return <main className="account-page"><a href="/sign-in" className="account-wordmark" aria-label="Listory sign in"><Wordmark/></a><section className="account-card"><div className="eyebrow">YOUR AGENT WORKSPACE</div><h1>{titles[mode]}</h1><p>{descriptions[mode]}</p>
    {linkError&&<p className="brand-error" role="alert">This link has expired or could not be verified. Open it in the same browser where you requested it, or request a new link. If your email is already confirmed, you can sign in below.</p>}
    <form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');const data=new FormData(event.currentTarget);try{const response=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(data),next:destination})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');if(result.redirect)window.location.assign(result.redirect);else setMessage(result.message);}catch(e){setError(e instanceof Error?e.message:'We couldn’t connect. Please try again.');}finally{setBusy(false);}}}>
      {mode!=='reset-password'&&<label className="field">Email<div className="input-wrap"><input name="email" type="email" autoComplete="email" maxLength={254} required/></div></label>}
      {mode!=='forgot-password'&&<label className="field">{mode==='reset-password'?'New password':'Password'}<div className="input-wrap"><input name="password" type="password" autoComplete={mode==='sign-in'?'current-password':'new-password'} minLength={mode==='sign-in'?1:8} maxLength={128} required/></div>{mode!=='sign-in'&&<small>At least 8 characters.</small>}</label>}
      {mode==='reset-password'&&<label className="field">Confirm new password<div className="input-wrap"><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></div></label>}
      {error&&<p className="brand-error" role="alert">{error}</p>}{message&&<p className="account-message" role="status">{message}</p>}
      <button className="primary" type="submit" disabled={busy}>{busy?'Please wait…':mode==='sign-in'?'Sign In':mode==='sign-up'?'Create Account':mode==='forgot-password'?'Send Reset Link':'Save New Password'}</button>
    </form>
    <div className="account-links"><a href="/fresh">Browse Fresh Listings</a>{mode==='sign-in'?<><a href="/forgot-password">Forgot password?</a><a href="/create-account">Create an account</a></>:<a href="/sign-in">Back to Sign In</a>}</div>
  </section><p className="account-caption">A considered workspace for exceptional real estate.</p></main>;
}
