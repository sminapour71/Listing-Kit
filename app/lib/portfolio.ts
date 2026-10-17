import { siteOrigin } from './site-url';
export type PortfolioFields={portfolio_slug:string|null;portfolio_bio:string;portfolio_subareas:string[];portfolio_published:boolean};
export type PortfolioListingOption={slug:string;status:'draft'|'published';portfolio_featured:boolean;address:string};
export const validAgentSlug=(slug:string)=>slug.length>=2&&slug.length<=80&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)&&! /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(slug);
export function agentSlug(name:string){return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/g,'');}
export function portfolioUrl(slug:string){if(!validAgentSlug(slug))throw new Error('Invalid portfolio address.');return `${siteOrigin()}/agent/${slug}`;}
