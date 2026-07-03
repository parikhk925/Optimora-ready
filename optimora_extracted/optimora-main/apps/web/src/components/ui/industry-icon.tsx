/**
 * IndustryIcon — reusable icon container for industry packs and agent cards.
 * Consistent design system: h-10 w-10 rounded-xl container, h-5 w-5 Lucide icon.
 * Accepts an IndustryIconMeta or AgentIconMeta from the registry.
 */
import {
  Target, MessageCircle, Calculator, Microscope,
  TrendingUp, Scale, HeartPulse, Building2, ShoppingBag,
  Cpu, Lightbulb, Megaphone, Settings2, Users, Warehouse,
  Briefcase, Bot, type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Static icon map — avoids dynamic imports, keeps bundle predictable
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Target,
  MessageCircle,
  Calculator,
  Microscope,
  TrendingUp,
  Scale,
  HeartPulse,
  Building2,
  ShoppingBag,
  Cpu,
  Lightbulb,
  Megaphone,
  Settings2,
  Users,
  Warehouse,
  Briefcase,
  Bot,
};

interface IconWrapperProps {
  lucideIcon: string;
  bgClass: string;
  iconClass: string;
  /** Container size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

const SIZE_MAP = {
  sm: { wrapper: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { wrapper: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { wrapper: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
};

export function IndustryIcon({
  lucideIcon,
  bgClass,
  iconClass,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: IconWrapperProps) {
  const Icon = ICON_MAP[lucideIcon] ?? Briefcase;
  const s = SIZE_MAP[size];
  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center", s.wrapper, bgClass, className)}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      <Icon className={cn(s.icon, iconClass)} strokeWidth={1.75} />
    </div>
  );
}

/** Convenience: render from registry meta directly */
export function IndustryIconFromMeta({
  meta,
  size,
  className,
}: {
  meta: { lucideIcon: string; bgClass: string; iconClass: string; label: string };
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <IndustryIcon
      lucideIcon={meta.lucideIcon}
      bgClass={meta.bgClass}
      iconClass={meta.iconClass}
      size={size}
      className={className}
      aria-label={meta.label}
    />
  );
}
