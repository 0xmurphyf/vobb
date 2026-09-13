# VOBB — Voxx Blood Brothers MVP

A mobile dark-fantasy collection RPG inspired by the core mechanics of the classic Blood Brothers, rebuilt as a clean-room project.

核心目标不是做一个普通的 gacha RPG，而是保留 Blood Brothers 的核心味道：

**Familiar collection → Formation → Auto Battle → Evolution → Progression → Collection**

同时加入 VOBB 自己的世界观、美术和系统。

---

## 1. Technology Stack

| Layer | Choice | Phase |
|-------|--------|-------|
| Mobile Client | React Native + TypeScript | Phase 1 |
| UI State | Zustand | Phase 1 |
| Navigation | React Navigation | Phase 1 |
| Battle Rendering | React Native Skia | Phase 1/2 |
| API | Node.js + Fastify + TypeScript | Phase 1 |
| Validation | Zod | Phase 1 |
| ORM | Prisma | Phase 1 |
| Database | PostgreSQL | Phase 1 |
| Auth | JWT + Refresh Token | Phase 1 |
| Error Tracking | Sentry | Phase 1 |
| Cache | Redis | Phase 2/3 |
| Storage | S3 / Cloudflare R2 | Phase 2 |
| Analytics | PostHog / Firebase | Phase 2 |
| IAP | RevenueCat | Phase 4 |
| Deployment | Docker | Phase 1 |
| CI/CD | GitHub Actions | Phase 1 |
| Server | VPS 4C8G initially | Phase 1 |

> 一个重要调整：Redis 不应该成为 Phase 1 的必需组件。

第一阶段：
```
React Native
      ↓
Fastify API
      ↓
PostgreSQL
```

已经足够。需要的时候再加入：
```
Fastify
 ├── PostgreSQL
 └── Redis
      ├── Cache
      ├── Leaderboard
      ├── Rate Limit
      └── Temporary State
```

---

## 2. Architecture

```
                         ┌───────────────┐
                         │ React Native  │
                         │  TypeScript   │
                         └───────┬───────┘
                                 │
                              HTTPS
                                 │
                         ┌───────▼───────┐
                         │    Fastify    │
                         │      API      │
                         └───────┬───────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
       ┌─────▼─────┐      ┌──────▼──────┐     ┌─────▼─────┐
       │ PostgreSQL│      │ Battle      │     │   Redis   │
       │           │      │ Engine      │     │ Phase 2/3 │
       └───────────┘      └─────────────┘     └───────────┘
```

其中最重要的是：**Battle Engine 独立出来**

```
server/
├── api/
├── auth/
├── player/
├── familiar/
├── gacha/
├── progression/
├── inventory/
└── battle/
    ├── engine.ts
    ├── formula.ts
    ├── skills.ts
    ├── effects.ts
    ├── turn-order.ts
    └── replay.ts
```

不要把 Battle Engine 写死在 API route 里面。以后 PvE、Async PvP、Replay、Battle Simulation、Balance Testing、Admin Tools 全部可以调用同一个 Engine。

---

## 3. Core Gameplay Loop

VOBB 第一版不要追求大量系统。核心 Loop：

```
┌──────────────┐
│   Summon     │
└──────┬───────┘
       ↓
┌──────────────┐
│ Collect      │
│ Familiars    │
└──────┬───────┘
       ↓
┌──────────────┐
│ Formation    │
└──────┬───────┘
       ↓
┌──────────────┐
│ Auto Battle  │
└──────┬───────┘
       ↓
┌──────────────┐
│ EXP / Loot   │
└──────┬───────┘
       ↓
┌──────────────┐
│ Upgrade      │
│ Evolution    │
└──────┬───────┘
       │
       └──────────→ Battle again
```

这才是第一阶段真正应该验证的东西。

---

## 4. Familiar System

不要简单叫 Character。核心单位应该是 **Familiar**：

```
Familiar
├── ID
├── Name
├── Rarity
├── Element
├── Level
├── Star
├── HP
├── ATK
├── DEF
├── WIS
├── AGI
├── Skills
├── Evolution Line
└── Growth
```

例如：
```json
{
  "id": 1001,
  "name": "Iron Warden",
  "rarity": "R",
  "element": "EARTH",
  "base": {
    "hp": 900,
    "atk": 180,
    "def": 160,
    "wis": 80,
    "agi": 120
  },
  "skills": [101],
  "evolutionLine": 1
}
```

---

## 5. Formation

Formation 不应该只是"选择 5 个角色"。它应该成为战略系统：

```
        FRONT
      [ 1 ] [ 2 ]

      MIDDLE
    [ 3 ] [ 4 ]

        BACK
        [ 5 ]
```

位置可以影响：
- Target priority
- Damage
- Defense
- Skill
- Survival

因此玩家不是单纯追求"战力最高的 5 个"，而是"正确的 5 个 + 正确的位置"。

---

## 6. Battle Engine

第一版：**Server-authoritative + deterministic**

```
Battle Request
      ↓
Validate Formation
      ↓
Generate Seed
      ↓
Determine Turn Order
      ↓
Attack
      ↓
Skill Proc
      ↓
Damage
      ↓
Status Effects
      ↓
Death
      ↓
Next Turn
      ↓
Victory
```

服务器生成：`battleId`, `seed`, `battleVersion`

```json
{
  "battleId": "B-001928",
  "seed": 9281721,
  "engineVersion": "0.1.0"
}
```

这样以后可以完整重放：**Replay = seed + initial state + engine version**

对 PvP、作弊检测、Debug 和平衡测试都非常重要。

---

## 7. Element System

第一版：
- FIRE → EARTH
- EARTH → WATER
- WATER → FIRE
- LIGHT ↔️ DARK

克制关系：
- Advantage: ×1.25
- Neutral: ×1.00
- Disadvantage: ×0.80

但这些数字应该进入配置文件，而不是写死。以后调整平衡无需重新发布 App。

---

## 8. Gacha

N / R / SR / SSR + pity。但要特别注意：**RNG 必须服务器计算**。

客户端只发送：
```
POST /gacha/pull
```

服务器流程：
1. check currency
2. check pity
3. generate RNG
4. select rarity
5. select Familiar
6. update inventory
7. update pity
8. return result

客户端不能决定抽到了什么。

---

## 9. Database Schema

第一版 PostgreSQL：

| Table | 用途 |
|-------|------|
| players | 玩家主表 |
| users | 账号认证 |
| refresh_tokens | JWT 刷新令牌 |
| familiars | Familiar 定义 |
| familiar_instances | 玩家拥有的 Familiar 实例 |
| skills | 技能定义 |
| evolution_lines | 进化线路 |
| formations | 阵容 |
| formation_slots | 阵容槽位 |
| stages | 关卡定义 |
| stage_enemies | 关卡敌人 |
| player_progress | 玩家进度 |
| gacha_pools | 卡池 |
| gacha_items | 卡池物品 |
| gacha_history | 抽取历史 |
| pity_counters | 保底计数器 |
| inventory | 背包 |
| currencies | 货币 |
| battles | 战斗记录 |
| battle_logs | 战斗日志 |

关键设计：**familiar_instances** 不要直接把 Familiar 当玩家拥有的静态数据。

```
familiar (definition)
    ↓
familiar_instance (player-owned copy)
```

例如：
- Familiar Definition: Iron Warden
- Instance #92817: Level 27, Star 3, EXP 18291, Skill Level 4

这样以后强化、进化、突破、装备都比较容易扩展。

---

## 10. Phase 1 — Core Loop (Weeks 1–4)

必须完成：

- [ ] Guest Auth
- [ ] JWT
- [ ] Familiar system
- [ ] 12 base Familiars
- [ ] Level / Star / Skill
- [ ] Formation (3–5 slots)
- [ ] Gacha + Pity
- [ ] Battle Engine
- [ ] Element system
- [ ] PvE (10–15 stages)
- [ ] EXP / Loot
- [ ] Save/Load
- [ ] Battle replay

**不做：**
- PvP
- Friends
- Push
- IAP
- Ads
- Redis
- Guild
- Complex equipment

---

## 11. Phase 2 — Progression (Weeks 5–8)

- 30 PvE stages
- Daily quests
- Login rewards
- Equipment
- Codex
- Tutorial
- Stamina
- Better progression
- Analytics
- Sentry
- Object storage

---

## 12. Phase 3 — Social / PvP (Weeks 9–12)

- Async PvP (Defense Team → Snapshot → Attacker Battle Engine → Replay → Ranking)
- 这里 Redis 才真正开始有明显价值

---

## 13. Phase 4 — Monetization (Weeks 13–16)

- IAP via RevenueCat
- Gems
- Monthly Pass
- Starter Pack
- Optional rewarded ads
- Analytics: Funnel, Retention, ARPDAU

---

## 14. Phase 5 — Launch (Weeks 17–20)

- Battle animation (Lottie)
- Sound + BGM
- Optimization (memory, app size)
- TestFlight / Google Play Internal Testing
- Beta
- Store submission

---

## 15. 最重要的产品差异

VOBB 应该是：

**Blood Brothers DNA + Voxx World + Modern Mobile UX**

尤其应该把 Familiar、Evolution、Formation、Skill interaction、Dark fantasy collection 作为产品核心。

而不是把重点放在"SSR 有多难抽"。

---

## 16. V0.1 定义

```
VOBB 0.1
│
├── Login
├── 12 Familiars
├── 3 Elements
├── 5-slot Formation
├── Gacha + Pity
├── Level / EXP
├── Skill
├── Evolution
├── 10 PvE Stages
├── Auto Battle
├── Battle Replay
└── Save Progress
```

如果这 12 个 Familiar 就已经让人愿意反复抽、养、进化、换 Formation、重新挑战，那么 VOBB 的核心成立。

如果这个 Loop 不成立，后面加 PvP、Guild、IAP、Push、Redis 都没有意义。

---

## Getting Started

```bash
# Server
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev

# Client
cd client
npm install
npx expo start
```

---

## License

UNLICENSED — all rights reserved.
