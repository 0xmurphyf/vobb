import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// THE FIVE WARLORDS — Core Factions
// ============================================

// TRANSCENDENT: High WIS/AGI, Adaptation/Control
// PURIST: High HP/DEF, Defense/Discipline
// WILD: High AGI/ATK, Speed/Berserker
// UNKNOWN: Variable/Chaos
// CYBERIST: High ATK/AGI, Overclock/Damage

const CHARACTERS = [
  // One R-grade per Warlord
  { charId: 'adaptive_stalker', name: 'Adaptive Stalker', warlord: 'TRANSCENDENT', rarity: 'R', baseHp: 850, baseAtk: 160, baseDef: 140, baseWis: 180, baseAgi: 180, description: 'Adapts to enemy patterns in real-time.' },
  { charId: 'steadfast', name: 'Steadfast', warlord: 'PURIST', rarity: 'R', baseHp: 1200, baseAtk: 150, baseDef: 180, baseWis: 90, baseAgi: 100, description: 'Will not move. Will not fall.' },
  { charId: 'fungal_lurker', name: 'Fungal Lurker', warlord: 'WILD', rarity: 'R', baseHp: 800, baseAtk: 160, baseDef: 100, baseWis: 120, baseAgi: 180, description: 'Life finds a way. Death spreads it.' },
  { charId: 'void_pearl', name: 'Void Pearl', warlord: 'UNKNOWN', rarity: 'R', baseHp: 750, baseAtk: 140, baseDef: 90, baseWis: 160, baseAgi: 150, description: 'Reality bends around it.' },
  { charId: 'chrome_reaper', name: 'Chrome Reaper', warlord: 'CYBERIST', rarity: 'R', baseHp: 800, baseAtk: 220, baseDef: 100, baseWis: 110, baseAgi: 200, description: 'Overclocked beyond safe limits.' },
];

// ============================================
// STAGES (PvE)
// ============================================

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

  // Seed characters
  for (const char of CHARACTERS) {
    await prisma.character.create({ data: char });
  }
  console.log(`Created ${CHARACTERS.length} characters`);

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
      description: 'Summon familiars aligned with one of the Five Warlords',
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
