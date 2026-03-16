// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  // Webhooks must bypass auth — Stripe sends unauthenticated POST requests
  if (isWebhookRoute(context.request)) return;

  const { userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return context.redirect('/login');
  }
});
