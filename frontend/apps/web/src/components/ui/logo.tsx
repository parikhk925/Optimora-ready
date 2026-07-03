import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
}

const sizes = {
  sm: { box: "h-7 w-7 text-xs", text: "text-sm" },
  md: { box: "h-8 w-8 text-sm", text: "text-sm" },
  lg: { box: "h-10 w-10 text-base", text: "text-base" },
};

export function Logo({ size = "md", href = "/" }: LogoProps) {
  const s = sizes[size];
  return (
    <Link href={href} className="flex items-center gap-2.5 select-none">
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-xl font-bold text-white ${s.box}`}
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}
      >
        O
      </div>
      <span className={`font-bold text-[#0F1020] ${s.text}`}>Optimora</span>
    </Link>
  );
}
