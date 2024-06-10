import { stripe } from '@/lib/stripe';
import {
  manageSubscriptionStatusChange,
  upsertPriceRecord,
  upsertProductRecord,
} from '@/lib/stripe/adminTasks';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Define a set of relevant Stripe events that the webhook will handle
const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

// Define the POST function to handle incoming webhook requests
export async function POST(request: NextRequest) {
  // Parse the request body as text
  const body = await request.text();
  // Retrieve the Stripe signature from request headers
  const sig = headers().get('Stripe-Signature');

  // Retrieve the webhook secret from environment variables
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    // Verify the request signature and parse the event
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    // Handle signature verification errors
    console.log(`Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Check if the event type is relevant
  if (relevantEvents.has(event.type)) {
    try {
      // Handle different types of relevant events
      switch (event.type) {
        // Handle product creation or update events
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        // Handle price creation or update events
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        // Handle customer subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          console.log('FROM WEBHOOK🚀', subscription.status);
          break;
        // Handle checkout session completion events
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          // If the checkout session mode is subscription, handle subscription status change
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        // Throw an error for unhandled relevant events
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      // Handle errors during event processing
      console.log(error);
      return new NextResponse(
        'Webhook error: "Webhook handler failed. View logs."',
        { status: 400 }
      );
    }
  }
  // Respond with a success message
  return NextResponse.json({ received: true }, { status: 200 });
}
