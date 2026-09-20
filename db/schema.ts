import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const memories = sqliteTable(
  'memories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    locationName: text('location_name').notNull(),
    memoryDate: text('memory_date'),
    emotion: text('emotion').notNull(),
    visibility: text('visibility').notNull(),
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull(),
    locationPrecision: text('location_precision').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    publicLatitude: real('public_latitude').notNull(),
    publicLongitude: real('public_longitude').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('memories_user_date_idx').on(table.userId, table.memoryDate),
    index('memories_public_bounds_idx').on(
      table.visibility,
      table.publicLongitude,
      table.publicLatitude,
    ),
  ],
);

export const memoryMedia = sqliteTable(
  'memory_media',
  {
    id: text('id').primaryKey(),
    memoryId: text('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull().unique(),
    mediaType: text('media_type').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('memory_media_memory_sort_idx').on(table.memoryId, table.sortOrder)],
);
