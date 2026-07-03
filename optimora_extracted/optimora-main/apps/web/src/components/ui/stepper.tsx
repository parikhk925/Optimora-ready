interface StepperProps {
  steps: { label: string; sublabel?: string }[];
  current: number; // 0-based index
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const isCompleted = i < current;
        const isActive = i === current;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              {/* Circle */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border-2 transition-all ${
                  isCompleted
                    ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                    : isActive
                    ? "border-[#7C3AED] bg-white text-[#7C3AED]"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              {/* Label */}
              <div className="mt-1.5 text-center px-1">
                <p
                  className={`text-[11px] font-semibold whitespace-nowrap ${
                    isActive ? "text-[#7C3AED]" : isCompleted ? "text-[#0F1020]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 h-[2px] mt-[-16px] mx-1 transition-all ${
                  isCompleted ? "bg-[#7C3AED]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
