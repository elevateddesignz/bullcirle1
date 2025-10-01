// src/components/CheckoutForm.tsx
import React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    // 1) Call your backend to create a Checkout Session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const { sessionId } = await response.json();

    // 2) Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error('Stripe Checkout error:', error);
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <CardElement options={{ hidePostalCode: true }} />
      <button
        type="submit"
        disabled={!stripe}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          background: '#6772e5',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Pay
      </button>
    </form>
  );
}
