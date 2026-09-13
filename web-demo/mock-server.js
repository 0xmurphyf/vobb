const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const characters = [
  { id: '1001', charId: 'adaptive_stalker', name: 'Adaptive Stalker', faction: 'TRANSCENDENT', rarity: 'R', baseHp: 850, baseAtk: 160, baseDef: 140, baseWis: 180, baseAgi: 180, evolution: 0, gender: 'Unknown', skill: { name: 'REWRITE', description: 'Adapt enemy strength' }, passive: { name: 'Neural Sync', description: '+5% AGI per turn' }, description: 'Adapts to enemy patterns in real-time.' },
  { id: '1002', charId: 'steadfast', name: 'Steadfast', faction: 'PURIST', rarity: 'R', baseHp: 1200, baseAtk: 150, baseDef: 180, baseWis: 90, baseAgi: 100, evolution: 0, gender: 'M', skill: { name: 'HOLD THE LINE', description: 'Team DEF +20%, taunt' }, passive: { name: 'Iron Will', description: 'DEF +40% when HP < 30%' }, description: 'Will not move. Will not fall.' },
  { id: '1003', charId: 'fungal_lurker', name: 'Fungal Lurker', faction: 'WILD', rarity: 'R', baseHp: 800, baseAtk: 160, baseDef: 100, baseWis: 120, baseAgi: 180, evolution: 0, gender: 'None', skill: { name: 'PACK HUNT', description: 'All allies focus one target' }, passive: { name: 'Regeneration', description: 'Heal 3% HP per turn' }, description: 'Life finds a way.' },
  { id: '1004', charId: 'void_pearl', name: 'Void Pearl', faction: 'UNKNOWN', rarity: 'R', baseHp: 750, baseAtk: 140, baseDef: 90, baseWis: 160, baseAgi: 150, evolution: 0, gender: 'Unknown', skill: { name: 'SYNCHRONIZE', description: 'Copy enemy buff to ally' }, passive: { name: 'Unpredictable', description: '20% chance random buff' }, description: 'Reality bends around it.' },
  { id: '1005', charId: 'chrome_reaper', name: 'Chrome Reaper', faction: 'CYBERIST', rarity: 'R', baseHp: 800, baseAtk: 220, baseDef: 100, baseWis: 110, baseAgi: 200, evolution: 0, gender: 'None', skill: { name: 'SYSTEM OVERRIDE', description: 'Team Skill Proc +30%' }, passive: { name: 'Overclock', description: 'ATK +10%, HP drain' }, description: 'Overclocked beyond safe limits.' },
];

let instances = [];
const stages = [
  { stageId: '1_1', chapter: 1, number: 1, name: 'Abandoned Lab', staminaCost: 6, enemies: [{ name: 'Feral Slime', faction: 'WILD', level: 1, hp: 300, atk: 50, def: 30, wis: 20, agi: 40 }] },
  { stageId: '1_2', chapter: 1, number: 2, name: 'Tunnel Rats', staminaCost: 6, enemies: [{ name: 'Pack Wolf', faction: 'WILD', level: 2, hp: 400, atk: 70, def: 40, wis: 30, agi: 60 }] },
  { stageId: '1_3', chapter: 1, number: 3, name: 'Broken Signal', staminaCost: 8, enemies: [{ name: 'Signal Wraith', faction: 'UNKNOWN', level: 3, hp: 500, atk: 90, def: 50, wis: 40, agi: 80 }] },
  { stageId: '1_4', chapter: 1, number: 4, name: 'Outpost Defense', staminaCost: 8, enemies: [{ name: 'Raider', faction: 'PURIST', level: 4, hp: 600, atk: 100, def: 60, wis: 40, agi: 70 }] },
  { stageId: '1_5', chapter: 1, number: 5, name: 'The Threshold', staminaCost: 10, enemies: [{ name: 'Transcendent Aspirant', faction: 'TRANSCENDENT', level: 5, hp: 800, atk: 130, def: 70, wis: 50, agi: 90 }] },
];
let pityCounters = {};
const gachaPool = { id: 'pool1', name: 'The Awakening', active: true };

const FACTION_COUNTER = {
  TRANSCENDENT: { counters: ['PURIST', 'WILD'], counteredBy: ['UNKNOWN', 'CYBERIST'] },
  PURIST: { counters: ['CYBERIST', 'UNKNOWN'], counteredBy: ['TRANSCENDENT', 'WILD'] },
  WILD: { counters: ['PURIST', 'UNKNOWN'], counteredBy: ['TRANSCENDENT', 'CYBERIST'] },
  UNKNOWN: { counters: ['TRANSCENDENT', 'CYBERIST'], counteredBy: ['PURIST', 'WILD'] },
  CYBERIST: { counters: ['TRANSCENDENT', 'WILD'], counteredBy: ['PURIST', 'UNKNOWN'] },
};

function mulberry32(seed) {
  let s = seed | 0;
  return function() { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function computeStats(base, level, star) {
  const sm = 1 + (star - 1) * 0.05;
  return {
    currentHp: Math.round(base.baseHp * (1 + (level - 1) * 0.10) * sm),
    currentAtk: Math.round(base.baseAtk * (1 + (level - 1) * 0.10) * sm),
    currentDef: Math.round(base.baseDef * (1 + (level - 1) * 0.08) * sm),
    currentWis: Math.round(base.baseWis * (1 + (level - 1) * 0.08) * sm),
    currentAgi: Math.round(base.baseAgi * (1 + (level - 1) * 0.08) * sm),
  };
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const reqPath = parsed.pathname || '/';
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let postData = {};
    try { postData = body ? JSON.parse(body) : {}; } catch {}

    // Static file
    if (req.method === 'GET' && !reqPath.startsWith('/api')) {
      try {
        const filePath = reqPath === '/' ? '/index.html' : reqPath;
        const content = fs.readFileSync(path.join(__dirname, filePath));
        const types = { html: 'text/html;charset=utf-8', js: 'application/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg' };
        res.writeHead(200, { 'Content-Type': types[path.extname(filePath).slice(1)] || 'text/plain' });
        res.end(content);
      } catch { res.writeHead(404); res.end('Not found'); }
      return;
    }

    const api = reqPath.replace('/api', '');
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'u1';

    try {
      if (api === '/auth/guest' && req.method === 'POST') {
        return sendJSON(res, {
          accessToken: 'token_' + Date.now(),
          refreshToken: 'refresh_' + Date.now(),
          player: { id: 'p_' + Date.now(), name: postData.playerName || 'Hunter', level: 1, currencies: [{ type: 'gold', amount: 1000 }, { type: 'gems', amount: 500 }, { type: 'stamina', amount: 100 }] },
          user: { id: 'u_' + Date.now(), username: 'guest_' + Date.now().toString(36), guest: true },
        });
      }

      if (api === '/player/me' && req.method === 'GET') {
        return sendJSON(res, { name: 'Hunter', level: 1, currencies: [{ type: 'gold', amount: 1000 }, { type: 'gems', amount: 500 }, { type: 'stamina', amount: 100 }] });
      }

      if (api === '/characters' && req.method === 'GET') return sendJSON(res, characters);
      if (api === '/characters/mine' && req.method === 'GET') return sendJSON(res, instances);

      if (api.match(/\/characters\/.+\/levelup/) && req.method === 'POST') {
        const id = api.split('/')[2];
        const inst = instances.find(i => i.id === id);
        if (!inst) return sendJSON(res, { error: 'not_found' }, 404);
        inst.level = (inst.level || 1) + 1;
        const char = characters.find(c => c.id === inst.characterId);
        Object.assign(inst, computeStats(char, inst.level, inst.star));
        return sendJSON(res, { success: true, newLevel: inst.level, stats: { currentHp: inst.currentHp, currentAtk: inst.currentAtk } });
      }

      if (api === '/stages' && req.method === 'GET') return sendJSON(res, stages);

      if (api === '/battle/start' && req.method === 'POST') {
        const stage = stages.find(s => s.stageId === postData.stageId);
        if (!stage) return sendJSON(res, { error: 'not_found' }, 404);

        const battleId = 'B-' + Date.now().toString(36).toUpperCase();
        const seed = Math.floor(Math.random() * 2147483647);
        const rng = mulberry32(seed);

        const playerUnits = instances.slice(0, 5).map(inst => {
          const c = characters.find(ch => ch.id === inst.characterId);
          return { id: inst.id, name: c.name, faction: c.faction, rarity: c.rarity, level: inst.level || 1, star: inst.star || 1, skillLevel: 1, hp: inst.currentHp || c.baseHp, atk: inst.currentAtk || c.baseAtk, def: inst.currentDef || c.baseDef, wis: inst.currentWis || c.baseWis, agi: inst.currentAgi || c.baseAgi, currentHp: inst.currentHp || c.baseHp, maxHp: inst.currentHp || c.baseHp, isAlive: true };
        });
        const enemyUnits = stage.enemies.map((e, i) => ({ id: 'e' + i, name: e.name, faction: e.faction, rarity: 'N', level: e.level, star: 1, skillLevel: 1, hp: e.hp, atk: e.atk, def: e.def, wis: e.wis, agi: e.agi, currentHp: e.hp, maxHp: e.hp, isAlive: true }));

        const events = [];
        let turn = 0, status = 'defeat';

        while (turn < 50) {
          turn++;
          const order = [...playerUnits, ...enemyUnits].filter(u => u.isAlive).sort((a, b) => b.agi - a.agi);
          for (const atk of order) {
            if (!atk.isAlive) continue;
            const tgts = (atk.id.startsWith('e') ? playerUnits : enemyUnits).filter(u => u.isAlive);
            if (!tgts.length) break;
            const t = tgts[Math.floor(rng() * tgts.length)];
            const fc = FACTION_COUNTER[atk.faction];
            let fm = 1;
            if (fc?.counters.includes(t.faction)) fm = 1.25;
            else if (fc?.counteredBy.includes(t.faction)) fm = 0.8;
            const dmg = Math.max(1, Math.round((atk.atk - t.def * 0.5) * fm * (rng() < 0.1 ? 1.5 : 1) * (0.9 + rng() * 0.2)));
            t.currentHp = Math.max(0, t.currentHp - dmg);
            if (!t.currentHp) { t.isAlive = false; events.push({ turn, type: 'death', target: t.name, description: t.name + ' defeated!', isCrit: false, isMiss: false, isSkill: false, factionRelation: 'neutral' }); }
            events.push({ turn, type: 'attack', attacker: atk.name, target: t.name, damage: dmg, isCrit: false, isMiss: false, isSkill: false, factionRelation: fm > 1 ? 'counter' : fm < 1 ? 'countered' : 'neutral', description: atk.name + ' deals ' + dmg + ' to ' + t.name });
          }
          if (!playerUnits.some(u => u.isAlive)) { status = 'defeat'; break; }
          if (!enemyUnits.some(u => u.isAlive)) { status = 'victory'; break; }
        }

        return sendJSON(res, { status, turnCount: turn, events, battleId, seed, engineVersion: '0.1.0', rewards: status === 'victory' ? { exp: 100 + turn * 10, gold: 50 + turn * 5, items: [] } : null });
      }

      if (api === '/gacha' && req.method === 'GET') return sendJSON(res, [{ ...gachaPool, items: characters.map(c => ({ characterId: c.id, characterName: c.name, rarity: c.rarity, faction: c.faction, weight: 25, guaranteedSr: true })) }]);
      if (api === '/gacha/pity' && req.method === 'GET') return sendJSON(res, pityCounters[userId] || { count: 0, guaranteedSr: 10, guaranteedSsr: 100 });

      if (api === '/gacha/pull' && req.method === 'POST') {
        const pullCount = postData.pullType === 'multi' ? 10 : 1;
        const cost = postData.pullType === 'multi' ? 2700 : 300;
        if (!pityCounters[userId]) pityCounters[userId] = { count: 0, guaranteedSr: 10, guaranteedSsr: 100 };
        const pity = pityCounters[userId];
        const results = [];
        const rng = mulberry32(Date.now());

        for (let i = 0; i < pullCount; i++) {
          pity.count++;
          const r = rng();
          let rarity = 'N';
          if (pity.count >= 100) { rarity = 'SSR'; pity.count = 0; }
          else if (r < 0.01) { rarity = 'SSR'; pity.count = 0; }
          else if (r < 0.25) rarity = 'R';

          const c = characters[Math.floor(rng() * characters.length)];
          const stats = computeStats(c, 1, 1);
          const instId = 'inst_' + Date.now() + '_' + i;
          instances.push({ id: instId, characterId: c.id, level: 1, star: 1, skillLevel: 1, ...stats });
          results.push({ instanceId: instId, characterId: c.id, name: c.name, faction: c.faction, rarity: c.rarity, gender: c.gender, evolution: c.evolution, level: 1, star: 1, currentHp: stats.currentHp, currentAtk: stats.currentAtk, currentDef: stats.currentDef, currentWis: stats.currentWis, currentAgi: stats.currentAgi, totalExp: c.totalExp, description: c.description, skill: c.skill, passive: c.passive });
        }

        return sendJSON(res, { results, gemsSpent: cost, newPityCount: pity.count });
      }

      sendJSON(res, { error: 'not_found', api }, 404);
    } catch (e) {
      sendJSON(res, { error: 'server', message: e.message }, 500);
    }
  });
});

server.listen(3002, '0.0.0.0', () => console.log('Mock API on :3001'));
