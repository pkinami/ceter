import { randomUUID } from "node:crypto";
import type { DeliveryRegion, FulfillmentMethod, PaymentStatus, Prisma, Product, StockStatus } from "@prisma/client";
import { getDeliveryFee } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";

const VAT_RATE = Number(process.env.VAT_RATE ?? process.env.NEXT_PUBLIC_VAT_RATE ?? 0.16);

type CheckoutCustomer = {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
};

export type CheckoutInput = {
  method: "mpesa" | "card" | "pay_on_delivery";
  phone?: string;
  returnUrl?: string;
};

type CheckoutDeliveryInput = {
  fulfillmentMethod: FulfillmentMethod;
  delivery: {
    name: string;
    phone: string;
    email: string;
    region: DeliveryRegion | null;
    location: string;
    instructions: string;
  } | null;
};

export function assertCheckoutProviderConfigured(method: "mpesa" | "card") {
  if (method === "mpesa") {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY) {
      throw new Error("M-Pesa checkout is not configured.");
    }
    return;
  }

  if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET || !process.env.PESAPAL_IPN_ID) {
    throw new Error("Card checkout is not configured.");
  }
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL is required for production payment callbacks.");
  }
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function stockStatusAfterReserve(product: Product, quantity: number): StockStatus {
  if (product.stock_status === "backorder") return "backorder";
  return product.stock_quantity - quantity > 0 ? "in_stock" : "out_of_stock";
}

export function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^2547\d{8}$/.test(digits) || /^2541\d{8}$/.test(digits)) return digits;
  if (/^07\d{8}$/.test(digits) || /^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits) || /^1\d{8}$/.test(digits)) return `254${digits}`;
  throw new Error("Enter a valid Kenyan M-Pesa phone number.");
}

export async function createOrderFromCart(customer: CheckoutCustomer, checkout: CheckoutDeliveryInput = { fulfillmentMethod: "delivery", delivery: null }) {
  const cart = await prisma.cartItem.findMany({
    where: { user_id: customer.userId },
    include: { product: true }
  });

  const activeCart = cart
    .filter((item) => item.product.is_published && !item.product.archived_at)
    .map((item) => ({ ...item, quantity: Math.max(1, item.quantity) }));

  if (!activeCart.length) throw new Error("Your cart is empty.");

  const unavailable = activeCart.find((item) => item.product.stock_status !== "backorder" && item.product.stock_quantity < item.quantity);
  if (unavailable) {
    throw new Error(`${unavailable.product.name} has only ${Math.max(0, unavailable.product.stock_quantity)} unit${unavailable.product.stock_quantity === 1 ? "" : "s"} available.`);
  }

  const subtotal = activeCart.reduce((sum, item) => sum + item.product.price_kes * item.quantity, 0);
  const vatKes = Math.round(subtotal * VAT_RATE);
  let deliveryFeeKes = 0;
  if (checkout.fulfillmentMethod === "delivery") {
    if (!checkout.delivery?.region) throw new Error("Choose a delivery region.");
    if (!checkout.delivery.name) throw new Error("Enter the delivery contact name.");
    if (!checkout.delivery.phone) throw new Error("Enter the delivery phone number.");
    if (!checkout.delivery.email) throw new Error("Enter the delivery email.");
    if (!checkout.delivery.location) throw new Error("Enter delivery location or address details.");
    deliveryFeeKes = await getDeliveryFee(checkout.delivery.region);
  }
  const totalKes = subtotal + vatKes + deliveryFeeKes;

  return prisma.$transaction(async (tx) => {
    if (checkout.fulfillmentMethod === "delivery" && checkout.delivery) {
      await tx.profile.upsert({
        where: { id: customer.userId },
        update: {
          full_name: checkout.delivery.name,
          phone: checkout.delivery.phone,
          email: checkout.delivery.email,
          delivery_region: checkout.delivery.region,
          delivery_location: checkout.delivery.location,
          delivery_instructions: checkout.delivery.instructions || null
        },
        create: {
          id: customer.userId,
          full_name: checkout.delivery.name,
          phone: checkout.delivery.phone,
          email: checkout.delivery.email,
          role: "customer",
          delivery_region: checkout.delivery.region,
          delivery_location: checkout.delivery.location,
          delivery_instructions: checkout.delivery.instructions || null
        }
      });
    }
    const order = await tx.order.create({
      data: {
        user_id: customer.userId,
        status: "pending",
        fulfillment_method: checkout.fulfillmentMethod,
        delivery_region: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.region ?? null : null,
        delivery_fee_kes: deliveryFeeKes,
        delivery_name: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.name ?? null : null,
        delivery_phone: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.phone ?? null : null,
        delivery_email: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.email ?? null : null,
        delivery_location: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.location ?? null : null,
        delivery_instructions: checkout.fulfillmentMethod === "delivery" ? checkout.delivery?.instructions || null : null,
        total_kes: totalKes,
        order_items: {
          create: cart
            .filter((item) => item.product.is_published && !item.product.archived_at)
            .map((item) => ({
              product_id: item.product_id,
              quantity: Math.max(1, item.quantity),
              price_at_purchase_kes: item.product.price_kes
            }))
        }
      }
    });
    for (const item of activeCart) {
      if (item.product.stock_status === "backorder") continue;
      const updated = await tx.product.updateMany({
        where: { id: item.product_id, stock_quantity: { gte: item.quantity } },
        data: {
          stock_quantity: { decrement: item.quantity },
          stock_status: stockStatusAfterReserve(item.product, item.quantity)
        }
      });
      if (updated.count !== 1) throw new Error(`${item.product.name} no longer has enough stock.`);
      await tx.stockMovement.create({
        data: {
          product_id: item.product_id,
          delta: -item.quantity,
          reason: "SALE",
          reference: `Order ${order.id}`
        }
      });
    }
    await tx.cartItem.deleteMany({ where: { user_id: customer.userId } });
    return order;
  });
}

export async function createPayOnDeliveryPayment(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  const merchantReference = `CT-POD-${order.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const payment = await prisma.paymentTransaction.create({
    data: {
      order_id: order.id,
      provider: "manual_pay_on_delivery",
      method: "pay_on_delivery",
      status: "pending",
      amount_kes: order.total_kes,
      merchant_reference: merchantReference
    }
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "processing", payment_method: "pay_on_delivery" } });
  return payment;
}

export async function findReusablePayment(orderId: string, method: "mpesa" | "card") {
  return prisma.paymentTransaction.findFirst({
    where: {
      order_id: orderId,
      method,
      status: { in: ["pending", "initiated", "processing", "paid"] }
    },
    orderBy: { created_at: "desc" }
  });
}

export async function markPaymentStatus(
  id: string,
  status: PaymentStatus,
  data: { providerReference?: string | null; failureReason?: string | null; rawResponse?: unknown } = {}
) {
  const payment = await prisma.paymentTransaction.update({
    where: { id },
    data: {
      status,
      provider_reference: data.providerReference ?? undefined,
      failure_reason: data.failureReason ?? undefined,
      raw_response: data.rawResponse === undefined ? undefined : json(data.rawResponse),
      verified_at: status === "paid" || status === "failed" || status === "cancelled" ? new Date() : undefined
    }
  });

  if (status === "paid") {
    await prisma.order.update({
      where: { id: payment.order_id },
      data: { status: "paid", payment_method: payment.method }
    });
  } else if (status === "failed" || status === "cancelled") {
    const active = await prisma.paymentTransaction.count({
      where: { order_id: payment.order_id, status: { in: ["pending", "initiated", "processing", "paid"] } }
    });
    if (active === 0) {
      await prisma.order.update({ where: { id: payment.order_id }, data: { status: "pending" } });
    }
  }

  return payment;
}

async function darajaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials are not configured.");
  const baseUrl = process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`M-Pesa authentication failed: HTTP ${response.status}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("M-Pesa authentication did not return a token.");
  return { token: data.access_token, baseUrl };
}

export async function initiateMpesa(orderId: string, phone: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  if (order.status === "paid") throw new Error("This order is already paid.");

  const existing = await findReusablePayment(orderId, "mpesa");
  if (existing?.status === "paid") return existing;

  const normalizedPhone = normalizeKenyanPhone(phone);
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortCode || !passkey) throw new Error("M-Pesa shortcode and passkey are not configured.");

  const { token, baseUrl } = await darajaToken();
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const merchantReference = existing?.merchant_reference ?? `CT-${order.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const payload = {
    BusinessShortCode: shortCode,
    Password: Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64"),
    Timestamp: timestamp,
    TransactionType: process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline",
    Amount: order.total_kes,
    PartyA: normalizedPhone,
    PartyB: shortCode,
    PhoneNumber: normalizedPhone,
    CallBackURL: `${siteUrl()}/api/payments/mpesa/callback`,
    AccountReference: merchantReference,
    TransactionDesc: `Ceter order ${order.id.slice(0, 8)}`
  };

  const payment = existing ?? await prisma.paymentTransaction.create({
    data: {
      order_id: order.id,
      provider: "safaricom_daraja",
      method: "mpesa",
      status: "pending",
      amount_kes: order.total_kes,
      merchant_reference: merchantReference,
      phone: normalizedPhone
    }
  });

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || data.ResponseCode !== "0") {
    await markPaymentStatus(payment.id, "failed", { failureReason: data.errorMessage ?? data.ResponseDescription ?? "M-Pesa request failed.", rawResponse: data });
    throw new Error(data.errorMessage ?? data.ResponseDescription ?? "M-Pesa request failed.");
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "processing", payment_method: "mpesa" } });
  return prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: {
      status: "initiated",
      checkout_request_id: data.CheckoutRequestID,
      provider_reference: data.MerchantRequestID,
      raw_request: json({ ...payload, Password: "[redacted]" }),
      raw_response: json(data)
    }
  });
}

export async function queryMpesa(paymentId: string) {
  const payment = await prisma.paymentTransaction.findUnique({ where: { id: paymentId } });
  if (!payment?.checkout_request_id) throw new Error("Payment cannot be queried yet.");
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortCode || !passkey) throw new Error("M-Pesa shortcode and passkey are not configured.");
  const { token, baseUrl } = await darajaToken();
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64"),
      Timestamp: timestamp,
      CheckoutRequestID: payment.checkout_request_id
    }),
    cache: "no-store"
  });
  const data = await response.json();
  const code = String(data.ResultCode ?? "");
  if (code === "0") return markPaymentStatus(payment.id, "paid", { rawResponse: data });
  if (code) return markPaymentStatus(payment.id, code === "1032" ? "cancelled" : "failed", { failureReason: data.ResultDesc ?? "M-Pesa payment failed.", rawResponse: data });
  return markPaymentStatus(payment.id, "processing", { rawResponse: data });
}

async function pesapalToken() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) throw new Error("Pesapal credentials are not configured.");
  const baseUrl = process.env.PESAPAL_ENV === "production" ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3";
  const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.token) throw new Error(data.error?.message ?? "Pesapal authentication failed.");
  return { token: String(data.token), baseUrl };
}

export async function initiateCard(orderId: string, customer: CheckoutCustomer) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  if (order.status === "paid") throw new Error("This order is already paid.");
  const existing = await findReusablePayment(orderId, "card");
  if (existing?.redirect_url) return existing;

  const notificationId = process.env.PESAPAL_IPN_ID;
  if (!notificationId) throw new Error("Pesapal IPN notification ID is not configured.");
  const { token, baseUrl } = await pesapalToken();
  const merchantReference = `CT-${order.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const [firstName, ...rest] = (customer.fullName || "Ceter Customer").split(/\s+/);
  const payload = {
    id: merchantReference,
    currency: "KES",
    amount: order.total_kes,
    description: `Ceter order ${order.id.slice(0, 8)}`,
    callback_url: `${siteUrl()}/order-confirmation/${order.id}`,
    notification_id: notificationId,
    billing_address: {
      email_address: customer.email ?? "",
      phone_number: customer.phone ?? "",
      country_code: "KE",
      first_name: firstName,
      last_name: rest.join(" ") || firstName
    }
  };
  const payment = await prisma.paymentTransaction.create({
    data: {
      order_id: order.id,
      provider: "pesapal",
      method: "card",
      status: "pending",
      amount_kes: order.total_kes,
      merchant_reference: merchantReference,
      raw_request: json(payload)
    }
  });
  const response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.redirect_url) {
    await markPaymentStatus(payment.id, "failed", { failureReason: data.error?.message ?? data.message ?? "Card payment request failed.", rawResponse: data });
    throw new Error(data.error?.message ?? data.message ?? "Card payment request failed.");
  }
  await prisma.order.update({ where: { id: order.id }, data: { status: "processing", payment_method: "card" } });
  return prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: {
      status: "initiated",
      provider_reference: data.order_tracking_id,
      redirect_url: data.redirect_url,
      raw_response: json(data)
    }
  });
}

export async function verifyPesapalByTrackingId(orderTrackingId: string, merchantReference?: string | null) {
  const payment = await prisma.paymentTransaction.findFirst({
    where: {
      provider: "pesapal",
      OR: [
        { provider_reference: orderTrackingId },
        merchantReference ? { merchant_reference: merchantReference } : { provider_reference: orderTrackingId }
      ]
    }
  });
  if (!payment) return null;
  const { token, baseUrl } = await pesapalToken();
  const response = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store"
  });
  const data = await response.json();
  const status = String(data.payment_status_description ?? data.status ?? "").toUpperCase();
  if (status === "COMPLETED") return markPaymentStatus(payment.id, "paid", { rawResponse: data });
  if (status === "FAILED") return markPaymentStatus(payment.id, "failed", { failureReason: data.description ?? "Card payment failed.", rawResponse: data });
  if (status === "INVALID") return markPaymentStatus(payment.id, "failed", { failureReason: "Invalid Pesapal payment.", rawResponse: data });
  return markPaymentStatus(payment.id, "processing", { rawResponse: data });
}
