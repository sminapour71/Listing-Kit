import type {Metadata} from 'next';
import PublicComingSoon from '../components/public-coming-soon';
export const metadata:Metadata={title:'Guides | Listory'};
export default function Guides(){return <PublicComingSoon title="Perspective for the chapters ahead." eyebrow="LISTORY GUIDES" description="A thoughtful collection of real estate guides is on its way. These are future topics; no articles have been published yet." categories={['Buying a Home','Selling a Home','Understanding Strata','Neighbourhood Guides']}/>;}
