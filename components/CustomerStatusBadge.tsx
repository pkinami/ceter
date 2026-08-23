import { AlertCircle, CheckCircle2, Clock3, Loader2, PackageCheck, Truck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomerStatusBadgeProps = {
  status: string;
  context?: "payment" | "order" | "invoice" | "quote";
  size?: "sm" | "md";
  className?: string;
};

type StatusStyle = {
  label: string;
  description?: string;
  className: string;
  icon: typeof CheckCircle2;
};

const labels: Record<string, string> = {
  partially_paid: "Partially paid",
  pay_on_delivery: "Pay on delivery",
  in_progress: "In progress"
};

const paidStyle: StatusStyle = {
  label: "Paid",
  description: "Payment received",
  className: "border-green-200 bg-green-50 text-green-800 ring-green-600/10",
  icon: CheckCircle2
};

const pendingStyle: StatusStyle = {
  label: "Pending",
  description: "Awaiting confirmation",
  className: "border-amber-300 bg-amber-50 text-amber-900 ring-amber-600/15",
  icon: Clock3
};

function statusStyle(status: string, context: CustomerStatusBadgeProps["context"] = "order"): StatusStyle {
  const normalized = status.toLowerCase();

  if (["paid", "completed", "fulfilled", "accepted", "won"].includes(normalized)) {
    return {
      ...paidStyle,
      label: labels[normalized] ?? toTitleCase(normalized),
      description: context === "payment" || normalized === "paid" ? "Payment received" : "Complete"
    };
  }

  if (["pending", "initiated", "draft", "sent", "new"].includes(normalized)) {
    return {
      ...pendingStyle,
      label: labels[normalized] ?? toTitleCase(normalized),
      description: context === "payment" || normalized === "pending" ? "Awaiting payment" : "In review"
    };
  }

  if (["processing", "partially_paid", "quoted", "contacted", "ready"].includes(normalized)) {
    return {
      label: labels[normalized] ?? toTitleCase(normalized),
      description: normalized === "partially_paid" ? "Balance remains" : "In progress",
      className: "border-teal-200 bg-teal-50 text-teal-900 ring-teal-600/10",
      icon: normalized === "ready" ? PackageCheck : Loader2
    };
  }

  if (normalized === "dispatched") {
    return {
      label: "Dispatched",
      description: "On the way",
      className: "border-blue-200 bg-blue-50 text-blue-900 ring-blue-600/10",
      icon: Truck
    };
  }

  if (["failed", "cancelled", "closed", "rejected", "expired", "overdue"].includes(normalized)) {
    return {
      label: labels[normalized] ?? toTitleCase(normalized),
      description: normalized === "overdue" ? "Needs attention" : "Not completed",
      className: "border-red-200 bg-red-50 text-red-800 ring-red-600/10",
      icon: normalized === "overdue" ? AlertCircle : XCircle
    };
  }

  return {
    label: labels[normalized] ?? toTitleCase(normalized),
    className: "border-slate-200 bg-slate-50 text-slate-700 ring-slate-600/10",
    icon: AlertCircle
  };
}

export function CustomerStatusBadge({ status, context = "order", size = "sm", className }: CustomerStatusBadgeProps) {
  const style = statusStyle(status, context);
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-black shadow-sm ring-1",
        size === "md" ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs",
        style.className,
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
      <span className="capitalize leading-none">{style.label}</span>
      {style.description ? <span className="hidden border-l border-current/20 pl-1.5 font-semibold normal-case opacity-80 sm:inline">{style.description}</span> : null}
    </span>
  );
}

function toTitleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
