export const CONFIG = {
  API_BASE: 'https://voxxinc.xyz/api',
  TIMEOUT: 10000,
} as const

export const FACTIONS = ['TRANSCENDENT', 'PURIST', 'WILD', 'UNKNOWN', 'CYBERIST'] as const
export type Faction = typeof FACTIONS[number]

export const FACTION_ORDER: Faction[] = ['TRANSCENDENT', 'PURIST', 'WILD', 'UNKNOWN', 'CYBERIST']

export const FACTION_COLORS: Record<Faction, string> = {
  TRANSCENDENT: '#b86bff',
  PURIST: '#ff6b35',
  WILD: '#23d160',
  UNKNOWN: '#3298dc',
  CYBERIST: '#ff3860',
}

export const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const
export type Rarity = typeof RARITIES[number]

export const RARITY_COLORS: Record<Rarity, string> = {
  N: '#888',
  R: '#3298dc',
  SR: '#b86bff',
  SSR: '#f4c430',
  UR: '#ff3860',
}

export const STATS = ['hp', 'atk', 'def', 'wis', 'agi'] as const
export type Stat = typeof STATS[number]

export const STAT_LABELS: Record<Stat, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  wis: 'WIS',
  agi: 'AGI',
}

export const STAT_ICONS: Record<Stat, string> = {
  hp: '❤️',
  atk: '⚔️',
  def: '🛡️',
  wis: '✨',
  agi: '💨',
}
