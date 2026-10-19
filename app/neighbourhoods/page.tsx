import type {Metadata} from 'next';
import PublicComingSoon from '../components/public-coming-soon';
export const metadata:Metadata={title:'Neighbourhoods | Listory'};
export default function Neighbourhoods(){return <PublicComingSoon title="Find your sense of place." eyebrow="LISTORY NEIGHBOURHOODS" description="Every neighbourhood has its own rhythm. Begin in Yaletown: warehouse streets, waterfront walks and the places in between. Our first editorial guide takes a closer look." guide={{href:'/neighbourhoods/yaletown',label:'Explore Yaletown'}}/>;}
