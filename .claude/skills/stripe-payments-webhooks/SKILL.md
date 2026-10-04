---
name: stripe-payments-webhooks
description: Build and debug the Stripe payment flow for the E-Commerce project, covering Checkout Sessions, order creation, webhook signature verification, idempotent handling, stock updates, refunds and local testing with the Stripe CLI. Use this skill whenever the user mentions Stripe, checkout, payment, webhook, order status paid/pending/failed, refunds, or "mark order as paid", even if they only say "make checkout work".
---

# Stripe payments and webhooks

## Core rule

The browser is never the source of truth for payment. An order becomes `paid` only when your server receives a **verified Stripe webhook**. The success page just displays whatever status the database says.

## Flow

```
Cart -> POST /orders/checkout -> create Order(status: "pending") + Stripe Checkout Session
     -> redirect to session.url -> customer pays on Stripe
     -> Stripe POSTs checkout.session.completed to /api/webhooks/stripe
     -> verify signature -> mark Order paid, reduce stock, clear cart, queue emails, emit socket event
     -> customer returns to /checkout/success?order=<id> which reads status from the API
```

## Creating the session

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: order.items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: "usd",
      unit_amount: i.priceCents,               // integer cents, from the DB, never from the client
      product_data: { name: i.name, images: i.image ? [i.image] : [] },
    },
  })),
  customer_email: user.email,
  client_reference_id: String(order._id),
  metadata: { orderId: String(order._id) },
  success_url: `${env.FRONTEND_URL}/checkout/success?order=${order._id}`,
  cancel_url: `${env.FRONTEND_URL}/cart`,
});
await Order.updateOne({ _id: order._id }, { stripeSessionId: session.id });
```

Always recompute prices and totals on the server from the database. Ignore any price sent by the client. Apply coupons server-side.

## Webhook endpoint

```typescript
// Register BEFORE express.json() so the body stays raw
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, req.headers["stripe-signature"] as string, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Invalid signature");
  }

  switch (event.type) {
    case "checkout.session.completed":
      await paymentService.handleSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.expired":
    case "payment_intent.payment_failed":
      await paymentService.handleFailure(event);
      break;
  }
  res.json({ received: true });       // respond 2xx quickly; do slow work in queues
}));
```

Three things that commonly go wrong:

1. **Parsed body.** Signature verification needs the raw bytes. If `express.json()` runs first, verification fails. Mount the webhook route before it.
2. **Duplicate delivery.** Stripe retries events. Make handlers idempotent: store processed `event.id` values (unique index), or only transition `pending` to `paid` with a conditional update (`updateOne({ _id, status: "pending" }, ...)`) and skip if nothing changed.
3. **Slow handlers.** Return 2xx fast. Push emails and invoices to BullMQ.

## Handling success

Inside a Mongo transaction: set `status: "paid"`, `paidAt`, `paymentIntentId`; decrement stock (guarded by `stock >= qty`); clear the cart. After the transaction commits: enqueue order and payment confirmation emails, emit `order:updated` over Socket.IO, and log the event with the order id.

If stock cannot be fulfilled at this point (a race), mark the order `needs_review` and issue a refund rather than failing silently.

## Order status model

`pending` -> `paid` -> `processing` -> `shipped` -> `delivered`; side exits `cancelled`, `failed`, `refunded`. Enforce allowed transitions in the order service and let only admins move orders past `paid`.

## Refunds

Admin-only endpoint calls `stripe.refunds.create({ payment_intent })`, then sets the order to `refunded` only after the `charge.refunded` webhook confirms it.

## Local development and testing

```bash
stripe login
stripe listen --forward-to localhost:5000/api/webhooks/stripe   # prints the whsec_ signing secret for .env
stripe trigger checkout.session.completed
```

- Use test keys (`sk_test_...`). Test card: `4242 4242 4242 4242`, any future date, any CVC. Declined card: `4000 0000 0000 0002`.
- Never commit keys. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only; only the publishable key may reach the frontend.
- In tests, mock the Stripe client and build signed payloads with `stripe.webhooks.generateTestHeaderString`.
