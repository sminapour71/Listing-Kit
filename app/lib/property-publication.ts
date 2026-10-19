export type Publication = { slug: string; token?: string; url: string; status: 'draft' | 'published' };
export const publicationStorageKey = (address: string) => `listory.property.v1:${address.trim().toLowerCase()}`;

export type OwnedProperty = { slug: string; status: 'draft' | 'published'; listing: import('./listing').Listing; brand: import('./brand-profile').BrandProfile; sample: boolean; owner_id: string; updated_at: string; first_published_at:string|null; current_until:string|null; publication_date_unknown:boolean };
