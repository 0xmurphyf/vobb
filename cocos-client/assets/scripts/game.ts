import { _decorator, Component, Node, Label, Button, Sprite, Color, Prefab, instantiate, resources, SpriteFrame, Texture2D, sys, JsonAsset } from 'cc'
import { CONFIG, FACTION_COLORS, RARITY_COLORS, STAT_LABELS, STAT_ICONS, Faction, Rarity, Stat } from './config'

// ============ Interfaces ============
interface CharacterBase {
  id: string
  name: string
  faction: Faction
  rarity: Rarity
  baseHp: number
  baseAtk: number
  baseDef: number
  baseWis: number
  baseAgi: number
  skills: Skill[]
}

interface Skill {
  id: string
  name: string
  type: 'active' | 'passive'
  description: string
  damage?: number
  cooldown?: number
}

interface CharInstance {
  id: string
  characterId: string
  level: number
  star: number
  skillLevel: number
  currentHp: number
  currentAtk: number
  currentDef: number
  currentWis: number
  currentAgi: number
  character: CharacterBase
}

interface Player {
  name: string
  currencies: { type: string; amount: number }[]
}

// ============ Game State ============
class GameState {
  player: Player | null = null
  chars: CharInstance[] = []
  idx: number = 0
  formation: (string | null)[] = [null, null, null, null, null]
  pity: number = 0
}

export const state = new GameState()

// ============ API Layer ============
class ApiClient {
  private token: string = ''

  setToken(t: string) { this.token = t }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`
    const res = await fetch(CONFIG.API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    return res.json()
  }

  async login(): Promise<Player> {
    return this.request('POST', '/auth/login')
  }

  async getChars(): Promise<CharInstance[]> {
    return this.request('GET', '/chars')
  }

  async getChar(id: string): Promise<CharInstance> {
    return this.request('GET', `/chars/${id}`)
  }

  async upgradeChar(id: string): Promise<CharInstance> {
    return this.request('POST', `/chars/${id}/upgrade`)
  }

  async evolveChar(id: string): Promise<CharInstance> {
    return this.request('POST', `/chars/${id}/evolve`)
  }

  async upgradeSkill(charId: string, skillId: string): Promise<CharInstance> {
    return this.request('POST', `/chars/${charId}/skills/${skillId}`)
  }

  async getFormation(): Promise<(string | null)[]> {
    return this.request('GET', '/formation')
  }

  async saveFormation(formation: (string | null)[]): Promise<any> {
    return this.request('PUT', '/formation', { formation })
  }

  async gachaPull(count: number): Promise<any> {
    return this.request('POST', '/gacha/pull', { count })
  }

  async getCodex(): Promise<any[]> {
    return this.request('GET', '/codex')
  }

  async getBattleState(): Promise<any> {
    return this.request('GET', '/battle')
  }

  async startBattle(stageId: string): Promise<any> {
    return this.request('POST', '/battle/start', { stageId })
  }

  async performAction(action: any): Promise<any> {
    return this.request('POST', '/battle/action', action)
  }
}

export const api = new ApiClient()

// ============ Guest Mode ============
export async function guestLogin(): Promise<void> {
  state.player = {
    name: 'Hunter',
    currencies: [
      { type: 'gold', amount: 5000 },
      { type: 'gems', amount: 3000 },
      { type: 'stamina', amount: 100 },
    ]
  }

  // Generate starter chars (same as web-demo logic)
  const charData = [
    { id: 'c1', name: 'Adaptive Stalker', faction: 'TRANSCENDENT' as Faction, rarity: 'SSR' as Rarity, hp: 850, atk: 160, def: 140, wis: 180, agi: 180 },
    { id: 'c2', name: 'Purity Enforcer', faction: 'PURIST' as Faction, rarity: 'R' as Rarity, hp: 720, atk: 140, def: 130, wis: 120, agi: 130 },
    { id: 'c3', name: 'Fungal Overlord', faction: 'WILD' as Faction, rarity: 'R' as Rarity, hp: 900, atk: 110, def: 150, wis: 100, agi: 90 },
    { id: 'c4', name: 'Null Entity', faction: 'UNKNOWN' as Faction, rarity: 'R' as Rarity, hp: 650, atk: 150, def: 100, wis: 160, agi: 150 },
    { id: 'c5', name: 'Chrome Revenant', faction: 'CYBERIST' as Faction, rarity: 'R' as Rarity, hp: 800, atk: 170, def: 120, wis: 110, agi: 140 },
  ]

  state.chars = charData.map((c, i) => ({
    id: c.id,
    characterId: c.id,
    level: i === 0 ? 100 : 1,
    star: i === 0 ? 5 : 1,
    skillLevel: i === 0 ? 5 : 1,
    rarity: c.rarity,
    currentHp: c.hp + (i === 0 ? 10000 : 0),
    currentAtk: c.atk + (i === 0 ? 2000 : 0),
    currentDef: c.def + (i === 0 ? 1500 : 0),
    currentWis: c.wis + (i === 0 ? 1500 : 0),
    currentAgi: c.agi + (i === 0 ? 2000 : 0),
    character: {
      id: c.id,
      name: c.name,
      faction: c.faction,
      rarity: c.rarity,
      baseHp: c.hp,
      baseAtk: c.atk,
      baseDef: c.def,
      baseWis: c.wis,
      baseAgi: c.agi,
      skills: [
        { id: `${c.id}_s1`, name: 'Strike', type: 'active' as const, description: 'Basic attack', damage: 100, cooldown: 0 },
        { id: `${c.id}_s2`, name: 'Power Surge', type: 'active' as const, description: 'Strong attack', damage: 200, cooldown: 3 },
        { id: `${c.id}_p1`, name: 'Toughness', type: 'passive' as const, description: '+10% HP' },
        { id: `${c.id}_p2`, name: 'Quick Step', type: 'passive' as const, description: '+5% AGI' },
      ],
    },
  }))
}

// ============ Helpers ============
export function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString()
}

export function powerColor(power: number): Color {
  if (power >= 10000) return new Color(255, 56, 96, 255)
  if (power >= 5000) return new Color(244, 196, 48, 255)
  if (power >= 2000) return Color.WHITE
  return new Color(50, 152, 220, 255)
}
