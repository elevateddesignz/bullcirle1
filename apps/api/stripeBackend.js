import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15', // Use the current API version or update accordingly.
});

app.use(cors());
app.use(express.json());

// Example Endpoint: Create a Customer and attach a bank account (using a bank token)
// In production, you typically use a solution like Plaid to securely gather bank account details.
app.post('/api/create-customer', async (req, res) => {
  try {
    const { email, bankAccountToken } = req.body;
    // Create a new customer
    const customer = await stripe.customers.create({
      email,
    });
    // Attach the bank account token to the customer
    const bankAccount = await stripe.customers.createSource(customer.id, {
      source: bankAccountToken, // This token is created on the frontend using Stripe.js and Elements.
    });
    res.json({ customer, bankAccount });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Example Endpoint: Create an ACH Payment (Charge/PaymentIntent)
app.post('/api/ach-payment', async (req, res) => {
  try {
    const { customerId, amount, currency } = req.body;
    // Create a PaymentIntent for ACH debit
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents
      currency,
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
    });
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error creating ACH payment:', error);
    res.status(500).json({ error: 'Failed to create ACH payment' });
  }
});

// Additional endpoints for microdeposit verification and transfers can be added as needed.

// Start the Stripe backend server
app.listen(PORT, () =>
  console.log(`🚀 Stripe backend server running on port ${PORT}`)
);
