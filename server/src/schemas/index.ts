import { z } from 'zod';

// ---- Auth Schemas ----
export const guestLoginSchema = z.object({
  playerName: z.string().min(1).max(32).optional(),
});

export const registerSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// ---- Character Schemas ----
export const warlordEnum = z.enum(['TRANSCENDENT', 'PURIST', 'WILD', 'UNKNOWN', 'CYBERIST']);

export const characterResponseSchema = z.object({
  id: z.string(),
  charId: z.string(),
  name: z.string(),
  warlord: warlordEnum,
  rarity: z.enum(['N', 'R', 'SR', 'SSR']),
  baseHp: z.number(),
  baseAtk: z.number(),
  baseDef: z.number(),
  baseWis: z.number(),
  baseAgi: z.number(),
});

// ---- Formation Schemas ----
export const updateFormationSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  slots: z.array(z.string().nullable()).length(5),
  isDefault: z.boolean().optional(),
});

// ---- Gacha Schemas ----
export const gachaPullSchema = z.object({
  poolId: z.string().min(1),
  pullType: z.enum(['single', 'multi']),
});

// ---- Battle Schemas ----
export const startBattleSchema = z.object({
  stageId: z.string().min(1),
  formationId: z.string().min(1).optional(),
});

// ---- Error Schema ----
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});
