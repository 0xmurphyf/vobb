import { z } from 'zod';

// ---- Auth Schemas ----
export const guestLoginSchema = z.body({
  playerName: z.string().min(1).max(32).optional(),
});

export const registerSchema = z.body({
  email: z.string().email().optional(),
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
});

export const refreshSchema = z.body({
  refreshToken: z.string().min(10),
});

// ---- Character Schemas ----
export const factionEnum = z.enum(['TRANSCENDENT', 'PURIST', 'WILD', 'UNKNOWN', 'CYBERIST']);

export const characterResponseSchema = z.object({
  id: z.string(),
  charId: z.string(),
  name: z.string(),
  faction: factionEnum,
  rarity: z.enum(['N', 'R', 'SR', 'SSR']),
  gender: z.string(),
  evolution: z.number(),
  baseHp: z.number(),
  baseAtk: z.number(),
  baseDef: z.number(),
  baseWis: z.number(),
  baseAgi: z.number(),
  totalExp: z.number(),
  description: z.string().optional(),
  skill: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    effects: z.any(),
  }).nullable(),
  passive: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    effects: z.any(),
  }).nullable(),
  growth: z.object({
    id: z.string(),
    name: z.string(),
    expCurve: z.any(),
    statMultipliers: z.any(),
  }).nullable(),
  evolutionLine: z.object({
    id: z.string(),
    name: z.string(),
    stages: z.any(),
  }).nullable(),
});

export const characterInstanceResponseSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  level: z.number(),
  exp: z.number(),
  star: z.number(),
  skillLevel: z.number(),
  isInFormation: z.boolean(),
  character: characterResponseSchema,
});

// ---- Formation Schemas ----
export const updateFormationSchema = z.body({
  name: z.string().min(1).max(32).optional(),
  slots: z.array(z.string().nullable()).length(5),
  isDefault: z.boolean().optional(),
});

// ---- Gacha Schemas ----
export const gachaPullSchema = z.body({
  poolId: z.string().min(1),
  pullType: z.enum(['single', 'multi']),
});

// ---- Battle Schemas ----
export const startBattleSchema = z.body({
  stageId: z.string().min(1),
  formationId: z.string().min(1).optional(),
});

// ---- Error Schema ----
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});
