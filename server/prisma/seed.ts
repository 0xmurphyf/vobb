import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHARACTERS = [
  // FIRE
  { charId: 'iron_warden', name: 'Iron Warden', element: 'FIRE', rarity: 'R', baseHp: 900, baseAtk: 180, baseDef: 160, baseWis: 80, baseAgi: 120 },
  { charId: 'flame_sage', name: 'Flame Sage', element: 'FIRE', rarity: 'SR', baseHp: 750, baseAtk: 220, baseDef: 100, baseWis: 180, baseAgi: 140 },
  { charId: 'inferno_lord', name: 'Inferno Lord', element: 'FIRE', rarity: 'SSR', baseHp: 1200, baseAtk: 280, baseDef: 140, baseWis: 200, baseAgi: 160 },
  { charId: 'ember_fox', name: 'Ember Fox', element: 'FIRE', rarity: 'N', baseHp: 600, baseAtk: 120, baseDef: 80, baseWis: 60, baseAgi: 100 },
  // EARTH
  { charId: 'stone_guardian', name: 'Stone Guardian', element: 'EARTH', rarity: 'R', baseHp: 1100, baseAtk: 140, baseDef: 200, baseWis: 70, baseAgi: 90 },
  { charId: 'crystal_titan', name: 'Crystal Titan', element: 'EARTH', rarity: 'SR', baseHp: 1300, baseAtk: 160, baseDef: 240, baseWis: 90, baseAgi: 80 },
  { charId: 'earth_shaker', name: 'Earth Shaker', element: 'EARTH', rarity: 'SSR', baseHp: 1500, baseAtk: 200, baseDef: 280, baseWis: 120, baseAgi: 70 },
  { charId: 'moss_golem', name: 'Moss Golem', element: 'EARTH', rarity: 'N', baseHp: 800, baseAtk: 100, baseDef: 120, baseWis: 50, baseAgi: 60 },
  // WATER
  { charId: 'tide_caller', name: 'Tide Caller', element: 'WATER', rarity: 'R', baseHp: 800, baseAtk: 160, baseDef: 140, baseWis: 150, baseAgi: 130 },
  { charId: 'frost_mage', name: 'Frost Mage', element: 'WATER', rarity: 'SR', baseHp: 700, baseAtk: 200, baseDef: 110, baseWis: 210, baseAgi: 150 },
  { charId: 'ocean_queen', name: 'Ocean Queen', element: 'WATER', rarity: 'SSR', baseHp: 1000, baseAtk: 250, baseDef: 150, baseWis: 240, baseAgi: 170 },
  { charId: 'river_spirit', name: 'River Spirit', element: 'WATER', rarity: 'N', baseHp: 550, baseAtk: 110, baseDef: 90, baseWis: 100, baseAgi: 120 },
  // LIGHT
  { charId: 'holy_knight', name: 'Holy Knight', element: 'LIGHT', rarity: 'R', baseHp: 850, baseAtk: 170, baseDef: 150, baseWis: 130, baseAgi: 120 },
  { charId: 'light_bringer', name: 'Light Bringer', element: 'LIGHT', rarity: 'SR', baseHp: 750, baseAtk: 210, baseDef: 120, baseWis: 190, baseAgi: 140 },
  // DARK
  { charId: 'shadow_assassin', name: 'Shadow Assassin', element: 'DARK', rarity: 'R', baseHp: 700, baseAtk: 200, baseDef: 100, baseWis: 110, baseAgi: 180 },
  { charId: 'void_walker', name: 'Void Walker', element: 'DARK', rarity: 'SR', baseHp: 650, baseAtk: 230, baseDef: 90, baseWis: 160, baseAgi: 190 },
];

const STAGES = [
  { stageId: 'stage_1_1', chapter: 1, number: 1, name: 'Forest Edge', staminaCost: 6, enemies: [{ name: 'Slime', element: 'WATER', level: 1, hp: 300, atk: 50, def: 30, wis: 20, agi: 40 }], rewards: { exp: 50, gold: 100 } },
  { stageId: 'stage_1_2', chapter: 1, number: 2, name: 'Dark Woods', staminaCost: 6, enemies: [{ name: 'Wolf', element: 'FIRE', level: 2, hp: 400, atk: 70, def: 40, wis: 30, agi: 60 }, { name: 'Wolf Pup', element: 'FIRE', level: 1, hp: 200, atk: 40, def: 20, wis: 20, agi: 50 }], rewards: { exp: 80, gold: 150 } },
  { stageId: 'stage_1_3', chapter: 1, number: 3, name: 'Cave Entrance', staminaCost: 8, enemies: [{ name: 'Bat Swarm', element: 'DARK', level: 3, hp: 500, atk: 90, def: 50, wis: 40, agi: 80 }], rewards: { exp: 120, gold: 200 } },
  { stageId: 'stage_1_4', chapter: 1, number: 4, name: 'Goblin Camp', staminaCost: 8, enemies: [{ name: 'Goblin Warrior', element: 'EARTH', level: 4, hp: 600, atk: 100, def: 60, wis: 40, agi: 70 }, { name: 'Goblin Shaman', element: 'FIRE', level: 3, hp: 350, atk: 80, def: 30, wis: 70, agi: 50 }], rewards: { exp: 150, gold: 250 } },
  { stageId: 'stage_1_5', chapter: 1, number: 5, name: 'Bandit Hideout', staminaCost: 10, enemies: [{ name: 'Bandit Leader', element: 'FIRE', level: 5, hp: 800, atk: 130, def: 70, wis: 50, agi: 90 }, { name: 'Bandit', element: 'DARK', level: 3, hp: 400, atk: 80, def: 40, wis: 30, agi: 70 }], rewards: { exp: 200, gold: 300 } },
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
      name: 'Standard Summon',
      description: 'Standard gacha pool with all characters',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
