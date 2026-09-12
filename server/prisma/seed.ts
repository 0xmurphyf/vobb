import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed base characters (6 starter chars across elements)
const CHARACTERS = [
  { charId: 'knight_001', name: 'Dark Knight', element: 'DARK', rarity: 'R', baseHp: 1200, baseAtk: 180, baseDef: 150, baseSpd: 80 },
  { charId: 'samurai_001', name: 'Blade Samurai', element: 'FIRE', rarity: 'R', baseHp: 900, baseAtk: 220, baseDef: 100, baseSpd: 110 },
  { charId: 'elf_001', name: 'High Elf Archer', element: 'LIGHT', rarity: 'R', baseHp: 800, baseAtk: 200, baseDef: 80, baseSpd: 130 },
  { charId: 'mage_001', name: 'Earth Mage', element: 'EARTH', rarity: 'R', baseHp: 1000, baseAtk: 190, baseDef: 120, baseSpd: 90 },
  { charId: 'priest_001', name: 'Holy Priest', element: 'LIGHT', rarity: 'R', baseHp: 1100, baseAtk: 150, baseDef: 130, baseSpd: 85 },
  { charId: 'assassin_001', name: 'Shadow Assassin', element: 'DARK', rarity: 'SR', baseHp: 850, baseAtk: 260, baseDef: 70, baseSpd: 150 },
  { charId: 'wizard_001', name: 'Fire Wizard', element: 'FIRE', rarity: 'SR', baseHp: 750, baseAtk: 280, baseDef: 60, baseSpd: 120 },
  { charId: 'guardian_001', name: 'Earth Guardian', element: 'EARTH', rarity: 'SR', baseHp: 1500, baseAtk: 140, baseDef: 200, baseSpd: 60 },
  { charId: 'dragon_001', name: 'Ancient Dragon', element: 'FIRE', rarity: 'SSR', baseHp: 1800, baseAtk: 320, baseDef: 180, baseSpd: 100 },
  { charId: 'reaper_001', name: 'Soul Reaper', element: 'DARK', rarity: 'SSR', baseHp: 1400, baseAtk: 350, baseDef: 120, baseSpd: 140 },
  { charId: 'goddess_001', name: 'Light Goddess', element: 'LIGHT', rarity: 'SSR', baseHp: 1600, baseAtk: 280, baseDef: 160, baseSpd: 130 },
  { charId: 'titan_001', name: 'Storm Titan', element: 'WATER', rarity: 'SSR', baseHp: 2000, baseAtk: 300, baseDef: 200, baseSpd: 70 },
];

// Seed stages (3 chapters x 10 stages)
const STAGES = [];
for (let chapter = 1; chapter <= 3; chapter++) {
  for (let num = 1; num <= 10; num++) {
    const stageNum = (chapter - 1) * 10 + num;
    STAGES.push({
      stageId: `stage_${chapter}_${num}`,
      chapter,
      number: num,
      name: `Chapter ${chapter} - Stage ${num}`,
      staminaCost: 6,
      enemies: JSON.stringify([
        { charId: 'knight_001', level: stageNum * 2 },
        { charId: 'samurai_001', level: stageNum * 2 },
      ]),
      rewards: JSON.stringify({
        gold: 100 + stageNum * 20,
        exp: 50 + stageNum * 10,
        firstClear: { gems: 10 },
      }),
    });
  }
}

async function main() {
  console.log('Seeding database...');

  // Characters
  for (const char of CHARACTERS) {
    await prisma.character.upsert({
      where: { charId: char.charId },
      update: char,
      create: char,
    });
  }
  console.log(`Seeded ${CHARACTERS.length} characters`);

  // Stages
  for (const stage of STAGES) {
    await prisma.stage.upsert({
      where: { stageId: stage.stageId },
      update: stage,
      create: stage,
    });
  }
  console.log(`Seeded ${STAGES.length} stages`);

  // Standard Gacha Pool
  const allChars = await prisma.character.findMany();
  for (const char of allChars) {
    await prisma.gachaPool.upsert({
      where: { id: `standard_${char.charId}` },
      update: { weight: char.rarity === 'SSR' ? 1 : char.rarity === 'SR' ? 3 : char.rarity === 'R' ? 10 : 20 },
      create: {
        id: `standard_${char.charId}`,
        name: 'Standard',
        characterId: char.id,
        weight: char.rarity === 'SSR' ? 1 : char.rarity === 'SR' ? 3 : char.rarity === 'R' ? 10 : 20,
        guaranteedSr: char.rarity === 'SR' || char.rarity === 'SSR',
      },
    });
  }
  console.log('Seeded gacha pools');

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
