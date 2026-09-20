import { z } from 'zod';

export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>;
