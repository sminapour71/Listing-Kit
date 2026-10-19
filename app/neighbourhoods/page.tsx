import {publicPageMetadata} from '../lib/public-metadata';
import type {Metadata} from 'next';
import PublicComingSoon from '../components/public-coming-soon';
export const metadata:Metadata={...publicPageMetadata('/neighbourhoods'),title:'Neighbourhoods | Listory'};
export default function Neighbourhoods(){return <PublicComingSoon title="Find your sense of place." eyebrow="LISTORY NEIGHBOURHOODS" description="Every neighbourhood has its own rhythm. A closer look at the places we call home is coming soon. For now, discover homes and connect with agents on Listory."/>;}
