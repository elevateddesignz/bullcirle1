// src/components/FundsWallet.tsx
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

export default function FundsWallet() {
  // Steps: "link" (for bank linking) and "deposit" (for depositing funds)
  const [step, setStep] = useState<'link' | 'deposit'>('link');
  const [bankName, setBankName] = useState('');
  const [bankRouting, setBankRouting] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [achId, setAchId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe hooks for the deposit step.
  const stripe = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated bank linking using your backend ACH endpoint.
  const linkBank = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ach/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: bankName,
          routing_number: bankRouting,
          account_number: bankAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bank linking failed');
      }
      setAchId(data.id);
      // Proceed to deposit step.
      setStep('deposit');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle depositing funds with Stripe.
  const depositFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setStripeError(null);

    if (!stripe || !elements) {
      setStripeError('Stripe has not loaded.');
      setIsProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setStripeError('Card element not found.');
      setIsProcessing(false);
      return;
    }

    // Create a payment method using the card element.
    const { error: stripeErr, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeErr) {
      setStripeError(stripeErr.message || 'Failed to create payment method');
      setIsProcessing(false);
      return;
    }

    try {
      // Send paymentMethod.id and ACH relationship id along with the deposit amount to your backend.
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ach/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ach_relationship_id: achId,
          amount: parseFloat(amount),
          stripePaymentMethodId: paymentMethod?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Deposit failed');
      }
      toast.success('Funds deposit initiated successfully!');
      // Reset to linking state.
      setStep('link');
      setBankName('');
      setBankRouting('');
      setBankAccount('');
      setAmount('');
      setAchId('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during deposit');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4">💰 Funds Wallet</h2>
      {error && (
        <div className="text-red-500 bg-red-100 dark:bg-red-800/20 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      {step === 'link' ? (
        <div className="space-y-4">
          <input
            placeholder="Bank Name"
            className="input"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
          <input
            placeholder="Routing Number"
            className="input"
            value={bankRouting}
            onChange={(e) => setBankRouting(e.target.value)}
          />
          <input
            placeholder="Account Number"
            className="input"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
          />
          <button onClick={linkBank} className="btn-primary" disabled={loading}>
            {loading ? 'Linking...' : 'Link Bank Account'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            placeholder="Deposit Amount"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {/* Stripe Checkout Form */}
          <form onSubmit={depositFunds} className="space-y-4">
            <div className="p-4 border border-gray-300 rounded">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': { color: '#aab7c4' },
                    },
                    invalid: { color: '#9e2146' },
                  },
                }}
              />
            </div>
            {stripeError && <div className="text-red-500 text-sm">{stripeError}</div>}
            <button type="submit" className="btn-primary w-full" disabled={isProcessing}>
              {isProcessing ? 'Depositing...' : 'Deposit Funds'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
