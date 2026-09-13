// JSON Schema for Fastify validation

export const guestLoginSchema = {
  type: 'object',
  properties: {
    playerName: { type: 'string', minLength: 1, maxLength: 32 },
  },
  additionalProperties: true,
};

export const registerSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    username: { type: 'string', minLength: 3, maxLength: 32 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
  required: ['username', 'password'],
  additionalProperties: true,
};

export const refreshSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 10 },
  },
  required: ['refreshToken'],
};

export const updateFormationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 32 },
    slots: { type: 'array', items: { type: ['string', 'null'] }, minItems: 5, maxItems: 5 },
    isDefault: { type: 'boolean' },
  },
  additionalProperties: true,
};

export const gachaPullSchema = {
  type: 'object',
  properties: {
    poolId: { type: 'string', minLength: 1 },
    pullType: { type: 'string', enum: ['single', 'multi'] },
  },
  required: ['poolId', 'pullType'],
};

export const startBattleSchema = {
  type: 'object',
  properties: {
    stageId: { type: 'string', minLength: 1 },
    formationId: { type: 'string', minLength: 1 },
  },
  required: ['stageId'],
};
