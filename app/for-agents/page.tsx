import {publicPageMetadata} from '../lib/public-metadata';
import type {Metadata} from 'next';
import PublicShell from '../components/public-shell';
export const metadata:Metadata={...publicPageMetadata('/for-agents'),title:'For Agents | Listory'};
export default function ForAgents(){return <PublicShell><main className="public-for-agents"><div><p className="public-eyebrow">YOUR NEXT CHAPTER, BEAUTIFULLY PRESENTED</p><h1>Give your listings<br/>the introduction<br/>they deserve.</h1><p>A considered workspace for your property pages, brochures, Agent Portfolio and Open Houses.</p><div className="public-agent-actions"><a className="public-button" href="/create-account">Create an agent account ↗</a><a className="public-text-link" href="/sign-in">Agent Sign In ↗</a></div></div><div className="public-for-agents-image"><img src="/images/property-1.jpg" alt="A residential home with a landscaped garden"/></div></main></PublicShell>;}
