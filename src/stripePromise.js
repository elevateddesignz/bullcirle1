// src/stripePromise.ts (or .js)
import { loadStripe } from '@stripe/stripe-js';

// NOTE: Make sure you actually have a publishable key in your .env,
// e.g., VITE_STRIPE_PUBLISHABLE_KEY=pk_test_something
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default stripePromise;
