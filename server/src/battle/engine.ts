// ============================================
// VOBB Battle Engine v0.1
// Deterministic, server-authoritative
// Supports: skills, passives, status effects, formation-based targeting
// ============================================

// ---- Core Types ----

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

export interface StatusBuff {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  effect: 'atk_up' | 'def_up' | 'agi_up' | 'wis_up' | 'atk_down' | 'def_down' | 'agi_down' | 'poison' | 'heal_over_time' | 'stun' | 'taunt' | 'skill_proc_up';
  value: number;
  duration: number;
  sourceId: string;
}

export interface BattleUnit {
  instance: BattleCharacter;
  isEnemy: boolean;
  teamIndex: number;
  slotIndex: number;
  currentHp: number;
  maxHp: number;
  currentAtk: number;
  currentDef: number;
  currentWis: number;
  currentAgi: number;
  buffs: StatusBuff[];
  isAlive: boolean;
  isStunned: boolean;
  skillCooldown: number;
  passiveTriggered: boolean;
  damageDealt: number;
  damageTaken: number;
}

export interface BattleConfig {
  seed: number;
  maxTurns: number;
  engineVersion: string;
  factionSynergy: Record<string, number>;
}

export interface BattleEvent {
  turn: number;
  type: 'attack' | 'skill' | 'passive' | 'buff' | 'death' | 'victory' | 'defeat';
  attacker?: string;
  target?: string;
  damage?: number;
  isCrit: boolean;
  isMiss: boolean;
  isSkill: boolean;
  factionRelation: 'counter' | 'neutral' | 'countered';
  description: string;
  hpAfter?: number;
}

export interface BattleResult {
  status: 'victory' | 'defeat' | 'ongoing';
  turnCount: number;
  events: BattleEvent[];
  battleId: string;
  seed: number;
  engineVersion: string;
  rewards?: {
    exp: number;
    gold: number;
    items: { itemId: string; quantity: number }[];
  };
}

// ---- Deterministic RNG (Mulberry32) ----

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Faction Mutual Counter Matrix (Five-Point Star) ----

const FACTION_COUNTER: Record<string, { counters: string[]; counteredBy: string[] }> = {
  TRANSCENDENT: { counters: ['PURIST', 'WILD'], counteredBy: ['UNKNOWN', 'CYBERIST'] },
  PURIST: { counters: ['CYBERIST', 'UNKNOWN'], counteredBy: ['TRANSCENDENT', 'WILD'] },
  WILD: { counters: ['PURIST', 'UNKNOWN'], counteredBy: ['TRANSCENDENT', 'CYBERIST'] },
  UNKNOWN: { counters: ['TRANSCENDENT', 'CYBERIST'], counteredBy: ['PURIST', 'WILD'] },
  CYBERIST: { counters: ['TRANSCENDENT', 'WILD'], counteredBy: ['PURIST', 'UNKNOWN'] },
};

const COUNTER_MULTIPLIER = 1.25;
const COUNTERED_MULTIPLIER = 0.80;
const BASE_CRIT_CHANCE = 0.1;
const BASE_CRIT_MULTIPLIER = 1.5;
const VARIANCE_MIN = 0.9;
const VARIANCE_MAX = 1.1;

function getFactionMultiplier(attacker: string, defender: string): number {
  const relations = FACTION_COUNTER[attacker];
  if (!relations) return 1.0;
  if (relations.counters.includes(defender)) return COUNTER_MULTIPLIER;
  if (relations.counteredBy.includes(defender)) return COUNTERED_MULTIPLIER;
  return 1.0;
}

// ---- Damage Formulas ----

// Old formula: ATK - DEF×0.5, clamp to min 1
function calculatePhysicalDamage(atk: number, def: number): number {
  return Math.max(1, Math.floor(atk - def * 0.5));
}

// Wisdom variant: WIS×0.8 - DEF×0.3
function calculateWisdomDamage(wis: number, def: number): number {
  return Math.max(1, Math.floor(wis * 0.8 - def * 0.3));
}

// ---- Battle Engine ----

export class BattleEngine {
  private rng: () => number;
  private config: BattleConfig;
  private units: BattleUnit[] = [];
  private turnCount = 0;
  private events: BattleEvent[] = [];
  private battleId: string;

  constructor(config: BattleConfig, battleId: string) {
    this.config = config;
    this.rng = mulberry32(config.seed);
    this.battleId = battleId;
  }

  addUnit(character: BattleCharacter, isEnemy: boolean, teamIndex: number, slotIndex: number): void {
    const starMultiplier = 1 + (character.star - 1) * 0.05;
    const baseHp = character.hp;
    const finalHp = Math.round(baseHp * starMultiplier);

    this.units.push({
      instance: character,
      isEnemy,
      teamIndex,
      slotIndex,
      currentHp: finalHp,
      maxHp: finalHp,
      currentAtk: Math.round(character.atk * starMultiplier),
      currentDef: Math.round(character.def * starMultiplier),
      currentWis: Math.round(character.wis * starMultiplier),
      currentAgi: Math.round(character.agi * starMultiplier),
      buffs: [],
      isAlive: true,
      isStunned: false,
      skillCooldown: 0,
      passiveTriggered: false,
      damageDealt: 0,
      damageTaken: 0,
    });
  }

  runBattle(): BattleResult {
    this.triggerPassives('battle_start');

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

  // ---- Turn Processing ----

  private processTurn(): void {
    this.processStatusEffects();

    const order = [...this.units]
      .filter((u) => u.isAlive && !u.isStunned)
      .sort((a, b) => b.currentAgi - a.currentAgi);

    for (const attacker of order) {
      if (!attacker.isAlive || attacker.isStunned) continue;

      const targets = this.units.filter((u) => u.isEnemy !== attacker.isEnemy && u.isAlive);
      if (targets.length === 0) break;

      const useSkill = this.shouldUseSkill(attacker);
      if (useSkill) {
        this.useSkill(attacker, targets);
      } else {
        this.basicAttack(attacker, targets);
      }

      if (attacker.skillCooldown > 0) attacker.skillCooldown--;
    }
  }

  // ---- Status Effects ----

  private processStatusEffects(): void {
    for (const unit of this.units) {
      if (!unit.isAlive) continue;

      const expired: StatusBuff[] = [];

      for (const buff of unit.buffs) {
        if (buff.effect === 'poison') {
          const poisonDamage = Math.round(unit.maxHp * buff.value);
          unit.currentHp = Math.max(0, unit.currentHp - poisonDamage);
          unit.damageTaken += poisonDamage;
          this.logEvent({
            turn: this.turnCount,
            type: 'buff',
            target: unit.instance.name,
            damage: poisonDamage,
            isCrit: false,
            isMiss: false,
            isSkill: false,
            factionRelation: 'neutral',
            description: `${unit.instance.name} takes ${poisonDamage} poison damage`,
            hpAfter: unit.currentHp,
          });

          if (unit.currentHp === 0) {
            unit.isAlive = false;
            this.logDeath(unit);
          }
        }

        if (buff.effect === 'heal_over_time') {
          const healAmount = Math.round(unit.maxHp * buff.value);
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + healAmount);
          this.logEvent({
            turn: this.turnCount,
            type: 'buff',
            target: unit.instance.name,
            damage: -healAmount,
            isCrit: false,
            isMiss: false,
            isSkill: false,
            factionRelation: 'neutral',
            description: `${unit.instance.name} regenerates ${healAmount} HP`,
            hpAfter: unit.currentHp,
          });
        }

        buff.duration--;
        if (buff.duration <= 0) expired.push(buff);
      }

      unit.buffs = unit.buffs.filter((b) => !expired.includes(b));
      this.recalculateStats(unit);
    }
  }

  // ---- Basic Attack ----

  private basicAttack(attacker: BattleUnit, targets: BattleUnit[]): void {
    const target = this.selectTarget(attacker, targets);
    if (!target) return;

    const baseDamage = calculatePhysicalDamage(attacker.currentAtk, target.currentDef);
    const factionMult = getFactionMultiplier(attacker.instance.faction, target.instance.faction);
    const isCrit = this.rng() < BASE_CRIT_CHANCE;
    const critMult = isCrit ? BASE_CRIT_MULTIPLIER : 1.0;
    const variance = VARIANCE_MIN + this.rng() * (VARIANCE_MAX - VARIANCE_MIN);
    const finalDamage = Math.round(baseDamage * factionMult * critMult * variance);

    this.applyDamage(attacker, target, finalDamage, isCrit, false);
  }

  // ---- Target Selection ----

  private selectTarget(attacker: BattleUnit, targets: BattleUnit[]): BattleUnit | null {
    if (targets.length === 0) return null;

    const taunter = targets.find((t) => t.buffs.some((b) => b.effect === 'taunt'));
    if (taunter) return taunter;

    const frontTargets = targets.filter((t) => t.slotIndex <= 2);
    if (frontTargets.length > 0 && this.rng() < 0.7) {
      return frontTargets[Math.floor(this.rng() * frontTargets.length)];
    }

    return targets[Math.floor(this.rng() * targets.length)];
  }

  // ---- Damage Application ----

  private applyDamage(attacker: BattleUnit, target: BattleUnit, damage: number, isCrit: boolean, isSkill: boolean): void {
    target.currentHp = Math.max(0, target.currentHp - damage);
    target.damageTaken += damage;
    attacker.damageDealt += damage;

    if (target.currentHp === 0) {
      target.isAlive = false;
      this.logDeath(target);
    }

    const factionMult = getFactionMultiplier(attacker.instance.faction, target.instance.faction);

    this.logEvent({
      turn: this.turnCount,
      type: isSkill ? 'skill' : 'attack',
      attacker: attacker.instance.name,
      target: target.instance.name,
      damage,
      isCrit,
      isMiss: false,
      isSkill,
      factionRelation: factionMult > 1 ? 'counter' : factionMult < 1 ? 'countered' : 'neutral',
      description: `${attacker.instance.name} deals ${damage} damage to ${target.instance.name}`,
      hpAfter: target.currentHp,
    });
  }

  // ---- Skills ----

  private shouldUseSkill(unit: BattleUnit): boolean {
    if (unit.instance.skills.length === 0) return false;
    if (unit.skillCooldown > 0) return false;

    const skillProcBuff = unit.buffs.find((b) => b.effect === 'skill_proc_up');
    const procChance = 0.3 + (skillProcBuff ? skillProcBuff.value : 0);
    return this.rng() < procChance;
  }

  private useSkill(attacker: BattleUnit, targets: BattleUnit[]): void {
    const skills = attacker.instance.skills;
    if (skills.length === 0) return;

    const skillId = skills[Math.floor(this.rng() * skills.length)];

    switch (skillId) {
      case 'rewrite':
        this.skillRewrite(attacker, targets);
        break;
      case 'hold_the_line':
        this.skillHoldTheLine(attacker, targets);
        break;
      case 'pack_hunt':
        this.skillPackHunt(attacker, targets);
        break;
      case 'synchronize':
        this.skillSynchronize(attacker, targets);
        break;
      case 'system_override':
        this.skillSystemOverride(attacker, targets);
        break;
      default:
        this.basicAttack(attacker, targets);
        return;
    }

    attacker.skillCooldown = 3;
  }

  // REWRITE: Deal WIS-based damage and steal ATK
  private skillRewrite(attacker: BattleUnit, targets: BattleUnit[]): void {
    const target = this.selectTarget(attacker, targets);
    if (!target) return;

    const damage = Math.round(calculateWisdomDamage(attacker.currentWis, target.currentDef) * 1.5);
    const factionMult = getFactionMultiplier(attacker.instance.faction, target.instance.faction);
    const finalDamage = Math.round(damage * factionMult);

    this.applyDamage(attacker, target, finalDamage, false, true);
    this.applyBuff(attacker, {
      id: `rewrite_buff_${this.turnCount}`,
      name: 'Rewrite',
      type: 'buff',
      effect: 'atk_up',
      value: 0.1,
      duration: 3,
      sourceId: attacker.instance.id,
    });
    this.logEvent({
      turn: this.turnCount,
      type: 'skill',
      attacker: attacker.instance.name,
      description: `${attacker.instance.name} uses REWRITE — adapting enemy strength`,
      isCrit: false,
      isMiss: false,
      isSkill: true,
      factionRelation: 'neutral',
    });
  }

  // HOLD THE LINE: Taunt + damage reduction for team
  private skillHoldTheLine(attacker: BattleUnit, targets: BattleUnit[]): void {
    const allies = this.units.filter((u) => !u.isEnemy === !attacker.isEnemy && u.isAlive);

    this.applyBuff(attacker, {
      id: `taunt_${this.turnCount}`,
      name: 'Taunt',
      type: 'buff',
      effect: 'taunt',
      value: 1,
      duration: 2,
      sourceId: attacker.instance.id,
    });

    for (const ally of allies) {
      this.applyBuff(ally, {
        id: `def_up_${this.turnCount}`,
        name: 'Shield Wall',
        type: 'buff',
        effect: 'def_up',
        value: 0.2,
        duration: 2,
        sourceId: attacker.instance.id,
      });
    }

    this.logEvent({
      turn: this.turnCount,
      type: 'skill',
      attacker: attacker.instance.name,
      description: `${attacker.instance.name} uses HOLD THE LINE — team DEF +20%, drawing enemy fire`,
      isCrit: false,
      isMiss: false,
      isSkill: true,
      factionRelation: 'neutral',
    });
  }

  // PACK HUNT: All allies attack the same target
  private skillPackHunt(attacker: BattleUnit, targets: BattleUnit[]): void {
    const target = this.selectTarget(attacker, targets);
    if (!target) return;

    const allies = this.units.filter((u) => !u.isEnemy && u.isAlive);

    for (const ally of allies) {
      const damage = Math.round(calculatePhysicalDamage(ally.currentAtk, target.currentDef) * 0.6);
      const factionMult = getFactionMultiplier(ally.instance.faction, target.instance.faction);
      const finalDamage = Math.round(damage * factionMult);
      this.applyDamage(ally, target, finalDamage, false, true);
      if (!target.isAlive) break;
    }

    this.logEvent({
      turn: this.turnCount,
      type: 'skill',
      attacker: attacker.instance.name,
      target: target.instance.name,
      description: `${attacker.instance.name} uses PACK HUNT — all allies focus ${target.instance.name}`,
      isCrit: false,
      isMiss: false,
      isSkill: true,
      factionRelation: 'neutral',
    });
  }

  // SYNCHRONIZE: Copy an enemy buff to an ally
  private skillSynchronize(attacker: BattleUnit, targets: BattleUnit[]): void {
    const enemies = targets;
    const allies = this.units.filter((u) => !u.isEnemy && u.isAlive && u.instance.id !== attacker.instance.id);

    if (enemies.length === 0 || allies.length === 0) {
      this.basicAttack(attacker, targets);
      return;
    }

    const enemyWithBuff = enemies.find((e) => e.buffs.some((b) => b.type === 'buff'));
    if (!enemyWithBuff) {
      this.basicAttack(attacker, targets);
      return;
    }

    const stolenBuff = enemyWithBuff.buffs.find((b) => b.type === 'buff');
    if (!stolenBuff) {
      this.basicAttack(attacker, targets);
      return;
    }

    const targetAlly = allies[Math.floor(this.rng() * allies.length)];
    this.applyBuff(targetAlly, { ...stolenBuff, sourceId: attacker.instance.id });

    this.logEvent({
      turn: this.turnCount,
      type: 'skill',
      attacker: attacker.instance.name,
      target: targetAlly.instance.name,
      description: `${attacker.instance.name} uses SYNCHRONIZE — copying buff to ${targetAlly.instance.name}`,
      isCrit: false,
      isMiss: false,
      isSkill: true,
      factionRelation: 'neutral',
    });
  }

  // SYSTEM OVERRIDE: Team skill proc rate up
  private skillSystemOverride(attacker: BattleUnit, _targets: BattleUnit[]): void {
    const allies = this.units.filter((u) => !u.isEnemy && u.isAlive);

    for (const ally of allies) {
      this.applyBuff(ally, {
        id: `skill_proc_${this.turnCount}`,
        name: 'System Override',
        type: 'buff',
        effect: 'skill_proc_up',
        value: 0.3,
        duration: 3,
        sourceId: attacker.instance.id,
      });
    }

    this.logEvent({
      turn: this.turnCount,
      type: 'skill',
      attacker: attacker.instance.name,
      description: `${attacker.instance.name} uses SYSTEM OVERRIDE — team Skill Proc +30%`,
      isCrit: false,
      isMiss: false,
      isSkill: true,
      factionRelation: 'neutral',
    });
  }

  // ---- Passives ----

  private triggerPassives(trigger: 'battle_start' | 'on_hit' | 'low_hp'): void {
    for (const unit of this.units) {
      if (!unit.isAlive) continue;

      switch (unit.instance.faction) {
        case 'TRANSCENDENT':
          if (trigger === 'battle_start') {
            this.applyBuff(unit, {
              id: `neural_sync_${unit.instance.id}`,
              name: 'Neural Sync',
              type: 'buff',
              effect: 'agi_up',
              value: 0.05,
              duration: 999,
              sourceId: unit.instance.id,
            });
            unit.passiveTriggered = true;
          }
          break;

        case 'PURIST':
          if (trigger === 'low_hp' && unit.currentHp / unit.maxHp < 0.3 && !unit.passiveTriggered) {
            this.applyBuff(unit, {
              id: `iron_will_${unit.instance.id}`,
              name: 'Iron Will',
              type: 'buff',
              effect: 'def_up',
              value: 0.4,
              duration: 999,
              sourceId: unit.instance.id,
            });
            unit.passiveTriggered = true;
            this.logEvent({
              turn: this.turnCount,
              type: 'passive',
              attacker: unit.instance.name,
              description: `${unit.instance.name} triggers IRON WILL — DEF +40%`,
              isCrit: false,
              isMiss: false,
              isSkill: false,
              factionRelation: 'neutral',
            });
          }
          break;

        case 'WILD':
          if (trigger === 'battle_start') {
            this.applyBuff(unit, {
              id: `regen_${unit.instance.id}`,
              name: 'Regeneration',
              type: 'buff',
              effect: 'heal_over_time',
              value: 0.03,
              duration: 999,
              sourceId: unit.instance.id,
            });
            unit.passiveTriggered = true;
          }
          break;

        case 'UNKNOWN':
          if (trigger === 'battle_start' && this.rng() < 0.2) {
            const randomBuffs: Array<'atk_up' | 'def_up' | 'agi_up' | 'wis_up'> = ['atk_up', 'def_up', 'agi_up', 'wis_up'];
            const randomEffect = randomBuffs[Math.floor(this.rng() * randomBuffs.length)];
            this.applyBuff(unit, {
              id: `random_proc_${unit.instance.id}`,
              name: 'Unpredictable',
              type: 'buff',
              effect: randomEffect,
              value: 0.15,
              duration: 3,
              sourceId: unit.instance.id,
            });
          }
          break;

        case 'CYBERIST':
          if (trigger === 'battle_start') {
            this.applyBuff(unit, {
              id: `overclock_${unit.instance.id}`,
              name: 'Overclock',
              type: 'buff',
              effect: 'atk_up',
              value: 0.1,
              duration: 999,
              sourceId: unit.instance.id,
            });
            unit.passiveTriggered = true;
          }
          break;
      }
    }
  }

  // ---- Buff System ----

  private applyBuff(unit: BattleUnit, buff: StatusBuff): void {
    const existing = unit.buffs.findIndex((b) => b.effect === buff.effect && b.sourceId === buff.sourceId);
    if (existing >= 0) {
      unit.buffs[existing] = buff;
    } else {
      unit.buffs.push(buff);
    }
    this.recalculateStats(unit);
  }

  private recalculateStats(unit: BattleUnit): void {
    let atkMult = 1;
    let defMult = 1;
    let agiMult = 1;
    let wisMult = 1;

    for (const buff of unit.buffs) {
      if (buff.type === 'buff') {
        switch (buff.effect) {
          case 'atk_up': atkMult += buff.value; break;
          case 'def_up': defMult += buff.value; break;
          case 'agi_up': agiMult += buff.value; break;
          case 'wis_up': wisMult += buff.value; break;
        }
      }
    }

    const starMultiplier = 1 + (unit.instance.star - 1) * 0.05;
    unit.currentAtk = Math.round(unit.instance.atk * starMultiplier * atkMult);
    unit.currentDef = Math.round(unit.instance.def * starMultiplier * defMult);
    unit.currentAgi = Math.round(unit.instance.agi * starMultiplier * agiMult);
    unit.currentWis = Math.round(unit.instance.wis * starMultiplier * wisMult);
  }

  // ---- Logging ----

  private logEvent(event: BattleEvent): void {
    this.events.push(event);
  }

  private logDeath(unit: BattleUnit): void {
    this.logEvent({
      turn: this.turnCount,
      type: 'death',
      target: unit.instance.name,
      isCrit: false,
      isMiss: false,
      isSkill: false,
      factionRelation: 'neutral',
      description: `${unit.instance.name} has been defeated!`,
    });
  }

  // ---- Result ----

  private createResult(status: 'victory' | 'defeat'): BattleResult {
    if (status === 'victory') {
      this.logEvent({
        turn: this.turnCount,
        type: 'victory',
        isCrit: false,
        isMiss: false,
        isSkill: false,
        factionRelation: 'neutral',
        description: 'Victory!',
      });
    } else {
      this.logEvent({
        turn: this.turnCount,
        type: 'defeat',
        isCrit: false,
        isMiss: false,
        isSkill: false,
        factionRelation: 'neutral',
        description: 'Defeat...',
      });
    }

    return {
      status,
      turnCount: this.turnCount,
      events: this.events,
      battleId: this.battleId,
      seed: this.config.seed,
      engineVersion: this.config.engineVersion,
      rewards: status === 'victory' ? { exp: 100 + this.turnCount * 10, gold: 50 + this.turnCount * 5, items: [] } : undefined,
    };
  }
}
