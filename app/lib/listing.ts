import type { BrandProfile } from './brand-profile';
export type ListingImage = { id: string; url: string; name: string; pdfPages?: number };
export type Listing = {
  address: string; price: string; bedrooms: string; bathrooms: string; squareFootage: string;
  taxes: string; strata: string; parking: string; storage: string; description: string; features: string;
  photos: ListingImage[]; floorPlan: ListingImage | null;
};
export type ListingTextKey = Exclude<keyof Listing, 'photos' | 'floorPlan'>;
export const emptyListing: Listing = {
  address: '', price: '', bedrooms: '', bathrooms: '', squareFootage: '', taxes: '', strata: '',
  parking: '', storage: '', description: '', features: '', photos: [], floorPlan: null,
};
export const sampleListing: Listing = {
  address: '2847 West 35th Avenue, Vancouver, BC', price: '3480000', bedrooms: '5', bathrooms: '4', squareFootage: '3245',
  taxes: '10840.52', strata: '0', parking: '2-car garage', storage: 'Dedicated storage room',
  description: 'A thoughtfully composed home in the heart of Kerrisdale. Generous living spaces, warm natural materials, and an effortless connection to the outdoors create a setting for both quiet mornings and memorable evenings.\n\nThe open living and dining areas flow into a beautifully appointed kitchen, while expansive windows welcome natural light. A private garden offers room to unwind, entertain, and enjoy Vancouver living at its best.',
  features: 'Light-filled open living spaces, Chef-inspired kitchen, Private landscaped garden, Spacious primary suite, Covered outdoor entertaining, Double garage, Dedicated storage, Close to parks and village shops',
  photos: [1, 2, 3].map(n => ({ id: `sample-${n}`, url: `/images/property-${n}.jpg`, name: `Sample property photograph ${n}` })).concat([{ id: 'sample-4', url: '/images/hero.jpg', name: 'Sample architectural photograph' }]),
  floorPlan: { id: 'sample-plan', url: '/images/sample-floor-plan.svg', name: 'Illustrative sample floor plan' },
};
export const sampleBrand: BrandProfile = {
  firstName: 'Jamie', lastName: 'Davis', title: 'Realtor', teamName: 'The Davis Group', brokerageName: 'West Coast Realty',
  phone: '(604) 555-0123', email: 'jamie@example.com', website: 'www.jamiedavis.com', instagram: '@jamiedavis',
  headshot: '', personalLogo: '', brokerageLogo: '', primaryColour: '#244B3D', secondaryColour: '#EAECE2',
};
export const money = (value: string) => value.trim() && Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: Number(value) % 1 ? 2 : 0 }).format(Number(value)) : 'Not provided';
export const number = (value: string) => value.trim() && Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(Number(value)) : '—';
export const hasBrandDetails = (profile: BrandProfile) => profile.primaryColour.toLowerCase() !== '#244b3d' || profile.secondaryColour.toLowerCase() !== '#eaece2' || Object.entries(profile).some(([key, value]) => !['primaryColour', 'secondaryColour'].includes(key) && Boolean(value.trim()));
