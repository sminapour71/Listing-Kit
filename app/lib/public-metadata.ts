import type {Metadata} from 'next';
import {siteOrigin} from './site-url';

/** App-owned route paths only. Query/filter parameters are not canonical URLs. */
export function publicPageMetadata(path: string): Metadata {
  const canonical = new URL(path, siteOrigin()).href;
  return {alternates: {canonical}, openGraph: {url: canonical}};
}
