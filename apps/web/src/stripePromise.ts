// src/stripePromise.ts
import { loadStripe } from '@stripe/stripe-js';

// Replace with your real publishable key
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

export default stripePromise;
