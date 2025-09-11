const { z } = require('zod');

const userSyncSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().nullable().optional(),
  nickname: z.string().min(1).nullable().optional(),
  meta: z.object({}).optional(),
});

const progressSettleSchema = z.object({
  uid: z.string().min(1),
  level: z.number().int().positive(),
  changeItemsDelta: z.number().int(),
});

const challengeSettleSchema = z.object({
  uid: z.string().min(1),
  iq: z.number().int().min(0),
});

const itemUseSchema = z.object({
  uid: z.string().min(1),
  type: z.enum(['change']),
});

module.exports = {
  userSyncSchema,
  progressSettleSchema,
  challengeSettleSchema,
  itemUseSchema,
};