import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').unique().notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  tier: text('tier').notNull().default('free'),
  status: text('status').notNull().default('inactive'),
  currentPeriodEnd: integer('current_period_end'),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export const stripeEvents = sqliteTable('stripe_events', {
  eventId: text('event_id').primaryKey(),
  processedAt: integer('processed_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export const savedQrCodes = sqliteTable('saved_qr_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  contentData: text('content_data').notNull(),
  styleData: text('style_data').notNull(),
  logoData: text('logo_data'),
  thumbnailData: text('thumbnail_data'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export const dynamicQrCodes = sqliteTable('dynamic_qr_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  savedQrCodeId: text('saved_qr_code_id').notNull().references(() => savedQrCodes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  slug: text('slug').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  isPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('dynamic_qr_codes_user_id_idx').on(table.userId),
]);
