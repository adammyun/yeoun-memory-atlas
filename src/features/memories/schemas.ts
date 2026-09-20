import { z } from 'zod';
import {
  PLACE_GROUP_LIMIT,
  PLACE_GROUP_MAX_RADIUS_METERS,
  PLACE_GROUP_RADIUS_METERS,
} from './constants';

const coordinate = z.number();
const queryCoordinate = z.coerce.number();
export const emotionSchema = z.enum([
  'happy',
  'nostalgic',
  'love',
  'sad',
  'peaceful',
  'excited',
  'lonely',
  'meaningful',
]);

const filterYearSchema = z.coerce.number().int().min(1900).max(2200);
const filterEmotionsSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === '') return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  },
  z
    .array(emotionSchema)
    .max(emotionSchema.options.length)
    .default([])
    .transform((values) => Array.from(new Set(values))),
);

const memoryFilterFields = {
  year: filterYearSchema.optional(),
  emotion: filterEmotionsSchema,
};

const optionalDateSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.iso.date().nullable(),
);

export const boundsSchema = z
  .object({
    west: z.coerce.number().min(-180).max(180),
    south: z.coerce.number().min(-85).max(85),
    east: z.coerce.number().min(-180).max(180),
    north: z.coerce.number().min(-85).max(85),
    limit: z.coerce.number().int().min(1).max(300).default(200),
    ...memoryFilterFields,
  })
  .refine((value) => value.west < value.east, {
    message: 'west must be smaller than east',
    path: ['east'],
  })
  .refine((value) => value.south < value.north, {
    message: 'south must be smaller than north',
    path: ['north'],
  })
  .transform(({ emotion, ...value }) => ({ ...value, emotions: emotion }));

export const nearLocationSchema = z.object({
  lng: queryCoordinate.min(-180).max(180),
  lat: queryCoordinate.min(-85).max(85),
  radiusMeters: z.coerce
    .number()
    .int()
    .min(10)
    .max(PLACE_GROUP_MAX_RADIUS_METERS)
    .default(PLACE_GROUP_RADIUS_METERS),
  limit: z.coerce.number().int().min(1).max(PLACE_GROUP_LIMIT).default(20),
});

export const createMemorySchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(10_000),
  location_name: z
    .string()
    .trim()
    .max(160)
    .default('')
    .transform((value) => value || '기억이 남겨진 장소'),
  memory_date: optionalDateSchema.default(null),
  emotion: emotionSchema,
  visibility: z.enum(['private', 'unlisted', 'public']).default('private'),
  is_anonymous: z.boolean().default(true),
  location_precision: z.enum(['exact', 'approximate']).default('approximate'),
  lng: coordinate.min(-180).max(180),
  lat: coordinate.min(-85).max(85),
});

export const updateMemorySchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(10_000),
  memory_date: optionalDateSchema.default(null),
  emotion: emotionSchema,
  visibility: z.enum(['private', 'unlisted', 'public']),
  is_anonymous: z.boolean(),
});

export const memoryFiltersSchema = z
  .object(memoryFilterFields)
  .transform(({ emotion, ...value }) => ({ ...value, emotions: emotion }));

export const userMemoryFiltersSchema = z
  .object({
    ...memoryFilterFields,
    visibility: z.enum(['private', 'unlisted', 'public']).optional(),
    limit: z.coerce.number().int().min(1).max(300).default(100),
  })
  .transform(({ emotion, ...value }) => ({ ...value, emotions: emotion }));

export const memoryIdSchema = z.uuid();

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type MemoryFilters = z.infer<typeof memoryFiltersSchema>;
export type UserMemoryFilters = z.infer<typeof userMemoryFiltersSchema>;
