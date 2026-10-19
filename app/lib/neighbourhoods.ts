/** Conservative matching: never infer a neighbourhood from a street, price or description. */
export function isYaletownAddress(address: string) {
  return /(?:^|,)\s*yaletown\s*(?:,|$)/i.test(address) && /(?:^|,)\s*vancouver(?:\s*(?:,|$)|\s+(?:bc|british columbia)\b)/i.test(address);
}
export function hasYaletownSpecialty(subareas: unknown) {
  return Array.isArray(subareas) && subareas.some(area => typeof area === 'string' && area.trim().toLowerCase() === 'yaletown');
}
