import { listIndustryPacks } from "@/lib/automation-data";
import { statusLabel, statusColor } from "@/lib/os-data";
import {
  Building2, Home, Users, GraduationCap, ShoppingCart,
  Stethoscope, Truck, Layers, CreditCard, Briefcase,
  UtensilsCrossed, Factory, MapPin,
  Clock, Zap, ChevronRight, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { deployPackAction } from "./actions";

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Home, Users, GraduationCap, ShoppingCart,
  Stethoscope, Truck, Layers, CreditCard, Briefcase,
  UtensilsCrossed, Factory, MapPin,
};

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; cta: string }> = {
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  border: "border-indigo-100",  cta: "bg-indigo-600 hover:bg-indigo-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", cta: "bg-emerald-600 hover:bg-emerald-700" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  border: "border-violet-100",  cta: "bg-violet-600 hover:bg-violet-700" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   border: "border-amber-100",   cta: "bg-amber-600 hover:bg-amber-700" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-600",  border: "border-orange-100",  cta: "bg-orange-600 hover:bg-orange-700" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    border: "border-rose-100",    cta: "bg-rose-600 hover:bg-rose-700" },
  sky:     { bg: "bg-sky-50",     icon: "text-sky-600",     border: "border-sky-100",     cta: "bg-sky-600 hover:bg-sky-700" },
  teal:    { bg: "bg-teal-50",    icon: "text-teal-600",    border: "border-teal-100",    cta: "bg-teal-600 hover:bg-teal-700" },
  slate:   { bg: "bg-slate-50",   icon: "text-slate-600",   border: "border-slate-200",   cta: "bg-slate-700 hover:bg-slate-800" },
  gray:    { bg: "bg-gray-50",    icon: "text-gray-600",    border: "border-gray-200",    cta: "bg-gray-700 hover:bg-gray-800" },
  zinc:    { bg: "bg-zinc-50",    icon: "text-zinc-600",    border: "border-zinc-200",    cta: "bg-zinc-700 hover:bg-zinc-800" },
  pink:    { bg: "bg-pink-50",    icon: "text-pink-600",    border: "border-pink-100",    cta: "bg-pink-600 hover:bg-pink-700" },
};

export default async function PacksPage() {
  const INDUSTRY_PACKS = await listIndustryPacks();
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Industry Pack Marketplace</p>
        <h1 className="text-2xl font-bold text-gray-900">Deploy a team of AI agents for your industry</h1>
        <p className="mt-1 text-sm text-gray-500">
          13 industry packs. Each includes pre-configured agents, workflow templates, and dashboards — ready to deploy in minutes.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {INDUSTRY_PACKS.map((pack) => {
          const Icon = ICON_MAP[pack.icon] ?? Building2;
          const c = COLOR_MAP[pack.color] ?? COLOR_MAP.indigo;
          return (
            <div
              key={pack.key}
              className={cn("flex flex-col rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow", c.border)}
            >
              {/* Top */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", c.bg)}>
                    <Icon className={cn("h-5 w-5", c.icon)} strokeWidth={1.75} />
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusColor(pack.status))}>
                    {statusLabel(pack.status)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{pack.name}</h3>
                <p className="mt-0.5 text-[13px] font-medium text-gray-700">{pack.headline}</p>
                <p className="mt-1.5 text-[11px] text-gray-400 italic">{pack.forWho}</p>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-semibold text-gray-700">{pack.hoursSaved}h</span> saved/wk
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-semibold text-gray-700">{pack.agents.length}</span> agents
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="font-semibold text-gray-700">{pack.workflows.length}</span> flows
                </div>
              </div>

              {/* Workflows */}
              <div className="px-5 py-3 border-t border-gray-100 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Workflows included</p>
                <ul className="space-y-1">
                  {pack.workflows.slice(0, 4).map((w) => (
                    <li key={w} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                  {pack.workflows.length > 4 && (
                    <li className="text-xs text-gray-400">+{pack.workflows.length - 4} more</li>
                  )}
                </ul>
              </div>

              {/* ROI */}
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 line-clamp-2">{pack.roiEstimate}</p>
              </div>

              {/* CTA */}
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <form action={deployPackAction} className="flex-1">
                  <input type="hidden" name="packKey" value={pack.key} />
                  <button
                    type="submit"
                    className={cn("w-full rounded-xl py-2 text-center text-sm font-semibold text-white transition-colors", c.cta)}
                  >
                    Deploy Pack
                  </button>
                </form>
                <Link
                  href={`/dashboard/industry/${pack.key}`}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
