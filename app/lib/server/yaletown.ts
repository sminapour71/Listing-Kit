import 'server-only';
import {getFreshListings} from './fresh-listings';
import {getCurrentListings, getOpenHousesToday} from './public-discovery';
import {getDirectoryAgents} from './directory';
import {checked, supabase} from './properties';
import {isYaletownAddress, hasYaletownSpecialty} from '../neighbourhoods';
import type {DirectoryAgent} from '../agents-directory';

export async function getYaletownAgents() {
  const agents: DirectoryAgent[] = [];
  // The existing service-only RPC first excludes private/inactive accounts.
  // Search alone is not a specialty match: a name or brokerage can also match.
  for (let offset = 0; ;) {
    const page = await getDirectoryAgents('Yaletown', offset);
    if (page.agents.length) {
      const slugs = page.agents.map(agent => agent.slug).join(','); // validated by directory helper
      const response = await checked(await supabase(`/rest/v1/listory_agent_profiles?portfolio_published=eq.true&portfolio_slug=in.(${slugs})&select=portfolio_slug,portfolio_subareas`));
      const profiles: {portfolio_slug: string; portfolio_subareas: unknown}[] = await response.json();
      const qualified = new Set(profiles.filter(profile => hasYaletownSpecialty(profile.portfolio_subareas)).map(profile => profile.portfolio_slug));
      agents.push(...page.agents.filter(agent => qualified.has(agent.slug)));
    }
    if (page.nextOffset === null) break;
    offset = page.nextOffset;
  }
  return agents;
}

export const getYaletownFresh = async () => (await getFreshListings()).filter(home => isYaletownAddress(home.address));
export const getYaletownCurrent = async () => (await getCurrentListings()).filter(home => isYaletownAddress(home.address));
export const getYaletownOpenHouses = async () => (await getOpenHousesToday()).filter(event => isYaletownAddress(event.property.address));
