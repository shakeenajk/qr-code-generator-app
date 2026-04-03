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

export const landingPages = sqliteTable('landing_pages', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text('user_id').notNull(),
  savedQrCodeId:  text('saved_qr_code_id').references(() => savedQrCodes.id, { onDelete: 'cascade' }),
  slug:           text('slug').notNull().unique(),
  type:           text('type').notNull(),                 // 'pdf' | 'appstore'
  title:          text('title').notNull(),
  description:    text('description'),
  companyName:    text('company_name'),
  websiteUrl:     text('website_url'),
  ctaButtonText:  text('cta_button_text'),
  coverImageUrl:  text('cover_image_url'),
  // PDF-specific
  pdfUrl:         text('pdf_url'),
  // App Store-specific
  appStoreUrl:    text('app_store_url'),
  googlePlayUrl:  text('google_play_url'),
  appIconUrl:     text('app_icon_url'),
  screenshotUrl:  text('screenshot_url'),
  // Social links stored as JSON array e.g. '["facebook","twitter"]'
  socialLinks:    text('social_links'),
  isPaused:       integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt:      integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt:      integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('landing_pages_user_id_idx').on(table.userId),
  index('landing_pages_saved_qr_id_idx').on(table.savedQrCodeId),
]);

export const scanEvents = sqliteTable('scan_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  dynamicQrCodeId: text('dynamic_qr_code_id')
    .notNull()
    .references(() => dynamicQrCodes.id, { onDelete: 'cascade' }),
  scannedAt: integer('scanned_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  userAgent: text('user_agent'),
  country: text('country'),
  device: text('device'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
}, (table) => [
  index('scan_events_qr_id_scanned_at_idx').on(table.dynamicQrCodeId, table.scannedAt),
]);

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: integer('last_used_at'),
  revokedAt: integer('revoked_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('api_keys_user_id_idx').on(table.userId),
  index('api_keys_key_hash_idx').on(table.keyHash),
]);
