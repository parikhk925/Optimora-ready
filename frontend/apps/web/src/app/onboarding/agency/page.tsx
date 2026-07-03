import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Set up your agency — Optimora" };

export default function AgencyOnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Brand header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-lg font-bold">
              O
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Optimora</p>
              <p className="text-xs text-gray-500">Agency setup</p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to buyer setup
          </Link>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
