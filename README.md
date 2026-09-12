# vobb

Voxx Blood Brothers — mobile gacha RPG MVP

## Stack

| Layer | Choice |
|-------|--------|
| Client | React Native + TypeScript |
| Server | Node.js + Fastify |
| Database | PostgreSQL + Prisma |
| Cache | Redis |
| Deploy | VPS 4C8G |
| CI/CD | GitHub Actions |

## MVP Scope

- Battle system (auto turn-based, element counter)
- Gacha (N/R/SR/SSR + pity)
- Team building (3-5 slots)
- PvE campaign (20-30 stages)
- Async PvP (mirror combat + ranking)

## Roadmap

### Phase 1 — Core Loop (Weeks 1-4)
- [ ] Auth: guest + email login, JWT
- [ ] Gacha: weighted random, pity counter, 10-pull guarantee
- [ ] Battle: turn-based auto combat, element counter system
- [ ] Characters: 12 base chars, level/star/skill upgrades
- [ ] Teams: 3-5 slot squad builder
- [ ] PvE: 30 stages, stamina system, first-clear rewards

### Phase 2 — Progression (Weeks 5-8)
- [ ] Daily tasks + login rewards
- [ ] Equipment system (simplified)
- [ ] Character collection / codex
- [ ] Tutorial / onboarding flow
- [ ] Push notifications (stamina full, daily reset)

### Phase 3 — Social & PvP (Weeks 9-12)
- [ ] Async PvP: attack offline mirror, defense team
- [ ] Seasonal ranking + rewards
- [ ] Leaderboard (global + friends)
- [ ] Friend system (view profiles, gift stamina)

### Phase 4 — Monetization (Weeks 13-16)
- [ ] IAP: gems, monthly pass, starter pack
- [ ] RevenueCat integration
- [ ] Ad placement (optional rewarded ads)
- [ ] Analytics: funnel, retention, ARPDAU

### Phase 5 — Polish & Launch (Weeks 17-20)
- [ ] Lottie animations for battle effects
- [ ] Sound effects + BGM
- [ ] Performance optimization (bundle size, memory)
- [ ] Beta test (TestFlight + Google Play Internal)
- [ ] App Store / Play Store submission

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

## License

UNLICENSED — all rights reserved.
