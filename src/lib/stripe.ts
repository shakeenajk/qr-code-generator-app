import Stripe from 'stripe';

// Pinned to decouple SDK upgrades from API version changes.
// Bump deliberately after testing webhook payloads against the new schema.
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});
