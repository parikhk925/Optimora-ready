import Link from "next/link";
import { BuyerOnboarding } from "@/components/onboarding/buyer-onboarding";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Get started — Optimora",
  description:
    "Deploy your first AI agent team in minutes. Choose your industry, pick your goal, and automate your business with Optimora.",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Brand header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-bold shadow">
              O
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Optimora</p>
              <p className="text-xs text-gray-400">AI Automation OS</p>
            </div>
          </Link>

          <Link
            href="/onboarding/agency"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Setting up an agency?
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">
            Deploy your first AI agent team
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Automate your business with a team of AI agents — industry-specific, transparent, and human-approved.
          </p>
        </div>

        {/* Wizard card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <BuyerOnboarding />
        </div>

        {/* Trust footer */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
          {[
            "Demo Mode — no real data touched",
            "No credit card required",
            "No external sends without your approval",
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
