// ============================================
// VOBB Battle Engine
// Deterministic, server-authoritative
// ============================================

export interface BattleCharacter {
  id: string;
  name: string;
  faction: 'TRANSCENDENT' | 'PURIST' | 'WILD' | 'UNKNOWN' | 'CYBERIST';
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  level: number;
  star: number;
  skillLevel: number;
  hp: number;
  atk: number;
  def: number;
  wis: number;
  agi: number;
  skills: string[];
}

export interface BattleUnit {
  instance: BattleCharacter;
  isEnemy: boolean;
  teamIndex: number;
  slotIndex: number;
  currentHp: number;
  maxHp: number;
  buffs: StatusBuff[];
  isAlive: boolean;
}

export interface StatusBuff {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  effect: 'atk_up' | 'def_up' | 'agi_up' | 'atk_down' | 'def_down' | 'agi_down' | 'poison' | 'heal' | 'stun';
  value: number;
  duration: number;
}

export interface BattleConfig {
  seed: number;
  maxTurns: number;
  engineVersion: string;
  factionSynergy: Record<string, number>;
}

export interface BattleEvent {
  turn: number;
  attacker: string;
  target: string;
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  isSkill: boolean;
  factionRelation: 'counter' | 'neutral' | 'countered';
  description: string;
}

export interface BattleResult {
  status: 'victory' | 'defeat' | 'ongoing';
  turnCount: number;
  events: BattleEvent[];
  rewards?: {
    exp: number;
    gold: number;
    items: { itemId: string; quantity: number }[];
  };
}

// RNG - Deterministic (Mulberry32)
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Faction Mutual Counter Matrix (Five-Point Star)
// Each faction counters exactly 2 others, is countered by exactly 2 others
// Forms a pentagon: T→P→C→T and T→W→U→T
const FACTION_COUNTER: Record<string, { counters: string[]; counteredBy: string[] }> = {
  TRANSCENDENT:  { counters: ['PURIST', 'WILD'],        counteredBy: ['UNKNOWN', 'CYBERIST'] },
  PURIST:        { counters: ['CYBERIST', 'UNKNOWN'],   counteredBy: ['TRANSCENDENT', 'WILD'] },
  WILD:          { counters: ['PURIST', 'UNKNOWN'],     counteredBy: ['TRANSCENDENT', 'CYBERIST'] },
  UNKNOWN:       { counters: ['TRANSCENDENT', 'CYBERIST'], counteredBy: ['PURIST', 'WILD'] },
  CYBERIST:      { counters: ['TRANSCENDENT', 'WILD'],  counteredBy: ['PURIST', 'UNKNOWN'] },
};

const COUNTER_MULTIPLIER = 1.25;
const COUNTERED_MULTIPLIER = 0.80;

function getFactionMultiplier(attacker: string, defender: string): number {
  const relations = FACTION_COUNTER[attacker];
  if (!relations) return 1.0;
  if (relations.counters.includes(defender)) return COUNTER_MULTIPLIER;
  if (relations.counteredBy.includes(defender)) return COUNTERED_MULTIPLIER;
  return 1.0;
}

export class BattleEngine {
  private rng: () => number;
  private config: BattleConfig;
  private units: BattleUnit[] = [];
  private turnCount = 0;
  private events: BattleEvent[] = [];

  constructor(config: BattleConfig) {
    this.config = config;
    this.rng = mulberry32(config.seed);
  }

  addUnit(character: BattleCharacter, isEnemy: boolean, teamIndex: number, slotIndex: number): void {
    const maxHp = character.hp;
    this.units.push({
      instance: character,
      isEnemy,
      teamIndex,
      slotIndex,
      currentHp: maxHp,
      maxHp,
      buffs: [],
      isAlive: true,
    });
  }

  runBattle(): BattleResult {
    while (this.turnCount < this.config.maxTurns) {
      this.turnCount++;
      this.processTurn();

      const playerAlive = this.units.some((u) => !u.isEnemy && u.isAlive);
      const enemyAlive = this.units.some((u) => u.isEnemy && u.isAlive);

      if (!playerAlive) return this.createResult('defeat');
      if (!enemyAlive) return this.createResult('victory');
    }
    return this.createResult('defeat');
  }

  private processTurn(): void {
    const order = [...this.units]
      .filter((u) => u.isAlive)
      .sort((a, b) => b.instance.agi - a.instance.agi);

    for (const attacker of order) {
      if (!attacker.isAlive) continue;
      const targets = this.units.filter((u) => u.isEnemy !== attacker.isEnemy && u.isAlive);
      if (targets.length === 0) break;
      const targetIdx = Math.floor(this.rng() * targets.length);
      this.attack(attacker, targets[targetIdx]);
    }
  }

  private attack(attacker: BattleUnit, target: BattleUnit): void {
    const baseDamage = Math.max(1, attacker.instance.atk - target.instance.def * 0.5);
    const factionMult = getFactionMultiplier(attacker.instance.faction, target.instance.faction);
    const isCrit = this.rng() < 0.1;
    const critMult = isCrit ? 1.5 : 1.0;
    const variance = 0.9 + this.rng() * 0.2;
    const finalDamage = Math.round(baseDamage * factionMult * critMult * variance);

    target.currentHp = Math.max(0, target.currentHp - finalDamage);
    if (target.currentHp === 0) target.isAlive = false;

    this.events.push({
      turn: this.turnCount,
      attacker: attacker.instance.name,
      target: target.instance.name,
      damage: finalDamage,
      isCrit,
      isMiss: false,
      isSkill: false,
      factionRelation: factionMult > 1 ? 'counter' : factionMult < 1 ? 'countered' : 'neutral',
      description: `${attacker.instance.name} deals ${finalDamage} damage to ${target.instance.name}`,
    });
  }

  private createResult(status: 'victory' | 'defeat'): BattleResult {
    return {
      status,
      turnCount: this.turnCount,
      events: this.events,
      rewards: status === 'victory' ? { exp: 100 + this.turnCount * 10, gold: 50 + this.turnCount * 5, items: [] } : undefined,
    };
  }
}
