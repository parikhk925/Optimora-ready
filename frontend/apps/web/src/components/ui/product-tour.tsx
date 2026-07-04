"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Package, Bot, GitBranch, Activity, TrendingUp, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface TourSlide {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  cta: { label: string; href: string };
}

const TOUR_SLIDES: TourSlide[] = [
  {
    icon: Package,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    label: "Industry Packs",
    title: "Deploy a full AI team for your industry",
    description:
      "Each Industry Pack includes pre-built agents, workflow templates, and dashboards — configured for your vertical from day one. 13 packs covering sales, finance, HR, operations, logistics, and more.",
    bullets: [
      "13 industry-specific agent packs",
      "Pre-configured workflows, no setup needed",
      "Deploy in minutes, not months",
      "White-label ready for agencies",
    ],
    cta: { label: "Browse Industry Packs", href: "/dashboard/packs" },
  },
  {
    icon: Bot,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    label: "AI Agent Library",
    title: "15 specialist AI agents, each built to own a job",
    description:
      "The Agent Library contains every AI worker available in Optimora. Agents are role-specific — a Sales Agent handles lead qualification, a Finance Agent handles reporting, and a Support Agent handles tickets.",
    bullets: [
      "15 specialist agents across all functions",
      "Each agent has defined inputs, outputs, and approval rules",
      "Approval checkpoints for sensitive actions",
      "Integration requirements shown upfront — no surprises",
    ],
    cta: { label: "Explore Agent Library", href: "/dashboard/agent-library" },
  },
  {
    icon: GitBranch,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    label: "Workflow Templates",
    title: "130 automation workflows, step by step",
    description:
      "Workflows are the processes your AI agents run. Each template shows you exactly what happens at every step — which agent runs it, whether human approval is needed, and what integrations are required.",
    bullets: [
      "130 pre-built business workflow templates",
      "Step-by-step transparency — no black box",
      "Human approval checkpoints built in",
      "Sample outputs shown before you deploy",
    ],
    cta: { label: "View Workflow Templates", href: "/dashboard/workflows" },
  },
  {
    icon: Activity,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    label: "Activity Feed",
    title: "See exactly what your AI agents are doing",
    description:
      "The Activity Feed gives you a real-time log of every action your agents take. Know which agent ran, what it did, how many items it processed, and whether it's waiting for your approval.",
    bullets: [
      "Real-time agent activity across all workflows",
      "Pending approval notifications front and centre",
      "Industry-tagged for multi-client views",
      "Connect live agents to replace sample data",
    ],
    cta: { label: "View Activity Feed", href: "/dashboard/activity" },
  },
  {
    icon: TrendingUp,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    label: "ROI Dashboard",
    title: "Measure hours saved and cost avoided",
    description:
      "The ROI Dashboard translates agent activity into business value. See hours saved, salary cost avoided, leads recovered, and revenue opportunity — by workflow and in total.",
    bullets: [
      "Hours saved and salary cost avoided",
      "Leads recovered and follow-ups completed",
      "Breakdown by workflow and agent",
      "Exportable client ROI reports for agencies",
    ],
    cta: { label: "View ROI Dashboard", href: "/dashboard/roi" },
  },
  {
    icon: Building2,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    label: "Agency White-label",
    title: "Resell AI automation under your brand",
    description:
      "Agency Mode lets you white-label the entire Optimora platform — your name, your logo, your pricing. Deploy industry packs for your clients and keep 100% of the markup.",
    bullets: [
      "White-label: your brand, not Optimora's",
      "Isolated client workspaces with full data separation",
      "Resell any industry pack at your own pricing",
      "Auto-generated client ROI reports",
    ],
    cta: { label: "Explore Agency Mode", href: "/dashboard/agency-os" },
  },
];

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductTour({ isOpen, onClose }: ProductTourProps) {
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_SLIDES[slide]!;
  const Icon = current.icon;
  const isFirst = slide === 0;
  const isLast = slide === TOUR_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {TOUR_SLIDES.map((s, i) => {
              const SlideIcon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                    i === slide
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                  )}
                  title={s.label}
                >
                  <SlideIcon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Icon + Label */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", current.iconBg)}>
              <Icon className={cn("h-6 w-6", current.iconColor)} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">{current.label}</p>
              <h2 className="text-base font-bold text-gray-900 leading-tight">{current.title}</h2>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">{current.description}</p>

          <ul className="space-y-2 mb-6">
            {current.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>

          {/* Progress */}
          <div className="flex gap-1 mb-5">
            {TOUR_SLIDES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i <= slide ? "bg-indigo-500" : "bg-gray-200",
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors",
              isFirst && "invisible",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {isLast ? (
              <a
                href={current.cta.href}
                onClick={onClose}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                {current.cta.label}
              </a>
            ) : (
              <>
                <a
                  href={current.cta.href}
                  onClick={onClose}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {current.cta.label}
                </a>
                <button
                  onClick={() => setSlide((s) => Math.min(TOUR_SLIDES.length - 1, s + 1))}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TourTriggerProps {
  onOpen: () => void;
}

export function TourTrigger({ onOpen }: TourTriggerProps) {
  return (
    <button
      id="product-tour-trigger"
      onClick={onOpen}
      className="group flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
        ?
      </span>
      Take the product tour
      <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
