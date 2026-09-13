import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHARACTERS = [
  {
    charId: 'adaptive_stalker',
    name: 'Adaptive Stalker',
    warlord: 'TRANSCENDENT',
    rarity: 'R',
    race: 'Human-Machine Hybrid',
    gender: 'Unknown',
    evolution: 0,
    baseHp: 850,
    baseAtk: 160,
    baseDef: 140,
    baseWis: 180,
    baseAgi: 180,
    totalExp: 5000,
    description: 'Adapts to enemy patterns in real-time.',
    skill: {
      skillId: 'rewrite',
      name: 'REWRITE',
      description: 'Adapt the enemy\'s strength and turn it against them.',
      effects: { type: 'adapt', value: 0.25 },
    },
    passive: {
      passiveId: 'neural_sync',
      name: 'Neural Sync',
      description: 'Gains +5% AGI for each turn survived.',
      effects: { type: 'stacking_agi', value: 0.05 },
    },
    growth: {
      growthId: 'transcendent_balanced',
      name: 'Transcendent Balanced',
      expCurve: [100, 250, 500, 1000, 2000, 5000],
      statMultipliers: { hp: 1.08, atk: 1.1, def: 1.06, wis: 1.12, agi: 1.1 },
    },
    evolutionLine: {
      name: 'Transcendent Path',
      stages: [
        { level: 10, requirements: { exp: 1000 } },
        { level: 25, requirements: { exp: 5000, items: ['neural_fragment'] } },
      ],
    },
  },
  {
    charId: 'steadfast',
    name: 'Steadfast',
    warlord: 'PURIST',
    rarity: 'R',
    race: 'Human',
    gender: 'M',
    evolution: 0,
    baseHp: 1200,
    baseAtk: 150,
    baseDef: 180,
    baseWis: 90,
    baseAgi: 100,
    totalExp: 5000,
    description: 'Will not move. Will not fall.',
    skill: {
      skillId: 'hold_the_line',
      name: 'HOLD THE LINE',
      description: 'Team gains damage reduction. Purist draws enemy fire.',
      effects: { type: 'taunt', value: 0.3 },
    },
    passive: {
      passiveId: 'iron_will',
      name: 'Iron Will',
      description: 'When HP drops below 30%, DEF increases by 40%.',
      effects: { type: 'low_hp_def', threshold: 0.3, value: 0.4 },
    },
    growth: {
      growthId: 'purist_tank',
      name: 'Purist Tank',
      expCurve: [100, 250, 500, 1000, 2000, 5000],
      statMultipliers: { hp: 1.12, atk: 1.06, def: 1.12, wis: 1.04, agi: 1.04 },
    },
    evolutionLine: {
      name: 'Purist Resolve',
      stages: [
        { level: 10, requirements: { exp: 1000 } },
        { level: 25, requirements: { exp: 5000, items: ['veteran_badge'] } },
      ],
    },
  },
  {
    charId: 'fungal_lurker',
    name: 'Fungal Lurker',
    warlord: 'WILD',
    rarity: 'R',
    race: 'Mutant Fungus',
    gender: 'None',
    evolution: 0,
    baseHp: 800,
    baseAtk: 160,
    baseDef: 100,
    baseWis: 120,
    baseAgi: 180,
    totalExp: 5000,
    description: 'Life finds a way. Death spreads it.',
    skill: {
      skillId: 'pack_hunt',
      name: 'PACK HUNT',
      description: 'All Wild units focus the same target.',
      effects: { type: 'focus_fire', value: 0.2 },
    },
    passive: {
      passiveId: 'regeneration',
      name: 'Regeneration',
      description: 'Regenerates 3% max HP each turn.',
      effects: { type: 'heal_over_time', value: 0.03 },
    },
    growth: {
      growthId: 'wild_aggressive',
      name: 'Wild Aggressive',
      expCurve: [100, 250, 500, 1000, 2000, 5000],
      statMultipliers: { hp: 1.06, atk: 1.12, def: 1.04, wis: 1.06, agi: 1.12 },
    },
    evolutionLine: {
      name: 'Wild Evolution',
      stages: [
        { level: 10, requirements: { exp: 1000 } },
        { level: 25, requirements: { exp: 5000, items: ['primal_essence'] } },
      ],
    },
  },
  {
    charId: 'void_pearl',
    name: 'Void Pearl',
    warlord: 'UNKNOWN',
    rarity: 'R',
    race: 'Unknown Entity',
    gender: 'Unknown',
    evolution: 0,
    baseHp: 750,
    baseAtk: 140,
    baseDef: 90,
    baseWis: 160,
    baseAgi: 150,
    totalExp: 5000,
    description: 'Reality bends around it.',
    skill: {
      skillId: 'synchronize',
      name: 'SYNCHRONIZE',
      description: 'Copy an enemy\'s buff and transfer it to an ally.',
      effects: { type: 'copy_buff', value: 1.0 },
    },
    passive: {
      passiveId: 'unpredictable',
      name: 'Unpredictable',
      description: 'Each attack has a 20% chance to trigger a random effect.',
      effects: { type: 'random_proc', chance: 0.2 },
    },
    growth: {
      growthId: 'unknown_chaos',
      name: 'Unknown Chaos',
      expCurve: [100, 250, 500, 1000, 2000, 5000],
      statMultipliers: { hp: 1.08, atk: 1.08, def: 1.06, wis: 1.1, agi: 1.08 },
    },
    evolutionLine: {
      name: 'Unknown Path',
      stages: [
        { level: 10, requirements: { exp: 1000 } },
        { level: 25, requirements: { exp: 5000, items: ['void_shard'] } },
      ],
    },
  },
  {
    charId: 'chrome_reaper',
    name: 'Chrome Reaper',
    warlord: 'CYBERIST',
    rarity: 'R',
    race: 'Machine',
    gender: 'None',
    evolution: 0,
    baseHp: 800,
    baseAtk: 220,
    baseDef: 100,
    baseWis: 110,
    baseAgi: 200,
    totalExp: 5000,
    description: 'Overclocked beyond safe limits.',
    skill: {
      skillId: 'system_override',
      name: 'SYSTEM OVERRIDE',
      description: 'Team gains increased skill proc rate for 3 turns.',
      effects: { type: 'skill_proc_up', value: 0.3, duration: 3 },
    },
    passive: {
      passiveId: 'overclock',
      name: 'Overclock',
      description: 'ATK +10% but loses 2% HP each turn.',
      effects: { type: 'atk_up_hp_drain', atkValue: 0.1, hpDrain: 0.02 },
    },
    growth: {
      growthId: 'cyberist_offense',
      name: 'Cyberist Offense',
      expCurve: [100, 250, 500, 1000, 2000, 5000],
      statMultipliers: { hp: 1.06, atk: 1.14, def: 1.04, wis: 1.06, agi: 1.12 },
    },
    evolutionLine: {
      name: 'Cyberist Ascension',
      stages: [
        { level: 10, requirements: { exp: 1000 } },
        { level: 25, requirements: { exp: 5000, items: ['quantum_core'] } },
      ],
    },
  },
];

const STAGES = [
  { stageId: 'stage_1_1', chapter: 1, number: 1, name: 'Abandoned Lab', staminaCost: 6, enemies: [{ name: 'Feral Slime', warlord: 'WILD', level: 1, hp: 300, atk: 50, def: 30, wis: 20, agi: 40 }], rewards: { exp: 50, gold: 100 } },
  { stageId: 'stage_1_2', chapter: 1, number: 2, name: 'Tunnel Rats', staminaCost: 6, enemies: [{ name: 'Pack Wolf', warlord: 'WILD', level: 2, hp: 400, atk: 70, def: 40, wis: 30, agi: 60 }, { name: 'Pup', warlord: 'WILD', level: 1, hp: 200, atk: 40, def: 20, wis: 20, agi: 50 }], rewards: { exp: 80, gold: 150 } },
  { stageId: 'stage_1_3', chapter: 1, number: 3, name: 'Broken Signal', staminaCost: 8, enemies: [{ name: 'Signal Wraith', warlord: 'UNKNOWN', level: 3, hp: 500, atk: 90, def: 50, wis: 40, agi: 80 }], rewards: { exp: 120, gold: 200 } },
  { stageId: 'stage_1_4', chapter: 1, number: 4, name: 'Outpost Defense', staminaCost: 8, enemies: [{ name: 'Raider', warlord: 'PURIST', level: 4, hp: 600, atk: 100, def: 60, wis: 40, agi: 70 }, { name: 'Mercenary', warlord: 'CYBERIST', level: 3, hp: 350, atk: 80, def: 30, wis: 70, agi: 50 }], rewards: { exp: 150, gold: 250 } },
  { stageId: 'stage_1_5', chapter: 1, number: 5, name: 'The Threshold', staminaCost: 10, enemies: [{ name: 'Transcendent Aspirant', warlord: 'TRANSCENDENT', level: 5, hp: 800, atk: 130, def: 70, wis: 50, agi: 90 }, { name: 'Cultist', warlord: 'UNKNOWN', level: 3, hp: 400, atk: 80, def: 40, wis: 30, agi: 70 }], rewards: { exp: 200, gold: 300 } },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.gachaItem.deleteMany();
  await prisma.gachaPool.deleteMany();
  await prisma.characterInstance.deleteMany();
  await prisma.character.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.passive.deleteMany();
  await prisma.growth.deleteMany();
  await prisma.evolutionLine.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.battle.deleteMany();
  await prisma.playerProgress.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.pityCounter.deleteMany();
  await prisma.gachaHistory.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.player.deleteMany();
  await prisma.user.deleteMany();

  // Seed characters with all fields
  for (const char of CHARACTERS) {
    // Create related records first
    const skill = await prisma.skill.create({ data: char.skill });
    const passive = await prisma.passive.create({ data: char.passive });
    const growth = await prisma.growth.create({ data: char.growth });
    const evolutionLine = await prisma.evolutionLine.create({ data: char.evolutionLine });

    await prisma.character.create({
      data: {
        charId: char.charId,
        name: char.name,
        warlord: char.warlord,
        rarity: char.rarity,
        race: char.race,
        gender: char.gender,
        evolution: char.evolution,
        baseHp: char.baseHp,
        baseAtk: char.baseAtk,
        baseDef: char.baseDef,
        baseWis: char.baseWis,
        baseAgi: char.baseAgi,
        totalExp: char.totalExp,
        description: char.description,
        skillId: skill.id,
        passiveId: passive.id,
        growthId: growth.id,
        evolutionLineId: evolutionLine.id,
      },
    });
  }
  console.log(`Created ${CHARACTERS.length} characters with skills, passives, growth curves, and evolution lines`);

  // Seed stages
  for (const stage of STAGES) {
    await prisma.stage.create({ data: stage });
  }
  console.log(`Created ${STAGES.length} stages`);

  // Create standard gacha pool
  const allCharacters = await prisma.character.findMany();
  const pool = await prisma.gachaPool.create({
    data: {
      name: 'The Awakening',
      description: 'Summon characters aligned with one of the Five Warlords',
      active: true,
      items: {
        create: allCharacters.map((char) => ({
          characterId: char.id,
          weight: char.rarity === 'N' ? 70 : char.rarity === 'R' ? 25 : char.rarity === 'SR' ? 4 : 1,
          guaranteedSr: char.rarity === 'SR',
        })),
      },
    },
  });
  console.log(`Created gacha pool: ${pool.name}`);

  console.log('Seed complete!');
  console.log('---');
  console.log('Five Warlords:');
  console.log('  🧬 TRANSCENDENT — Fusion / Adaptation');
  console.log('  ⚔️ PURIST — Discipline / Defense');
  console.log('  🐺 WILD — Instinct / Speed');
  console.log('  👁️ UNKNOWN — Chaos / Anomaly');
  console.log('  🤖 CYBERIST — Machine / Overclock');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
