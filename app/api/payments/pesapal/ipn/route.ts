import { NextResponse } from "next/server";
import { verifyPesapalByTrackingId } from "@/lib/payments";

async function readPayload(request: Request) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    return {
      orderTrackingId: url.searchParams.get("OrderTrackingId"),
      merchantReference: url.searchParams.get("OrderMerchantReference")
    };
  }
  const body = await request.json().catch(() => ({}));
  return {
    orderTrackingId: body.OrderTrackingId ?? url.searchParams.get("OrderTrackingId"),
    merchantReference: body.OrderMerchantReference ?? url.searchParams.get("OrderMerchantReference")
  };
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const payload = await readPayload(request);
  if (!payload.orderTrackingId) return NextResponse.json({ error: "Missing OrderTrackingId" }, { status: 400 });
  await verifyPesapalByTrackingId(String(payload.orderTrackingId), payload.merchantReference ? String(payload.merchantReference) : null);
  return NextResponse.json({ orderNotificationType: "IPNCHANGE", orderTrackingId: payload.orderTrackingId, orderMerchantReference: payload.merchantReference });
}
