export type Publication = { slug: string; token: string; url: string; status: 'draft' | 'published' };
export const publicationStorageKey = (address: string) => `listory.property.v1:${address.trim().toLowerCase()}`;
