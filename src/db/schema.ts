import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
