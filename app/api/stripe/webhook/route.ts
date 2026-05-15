import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: true, stripe_customer_id: session.customer })
        .eq("id", userId);
      if (error) {
        console.error("Supabase profile update failed for checkout.session.completed:", error);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }
  } else if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: isActive })
      .eq("stripe_customer_id", customerId);
    if (error) {
      console.error("Supabase profile update failed for customer.subscription.updated:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    await supabase
      .from("profiles")
      .update({ is_pro: false })
      .eq("stripe_customer_id", customerId);
  }

  return NextResponse.json({ received: true });
}