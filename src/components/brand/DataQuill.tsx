import { cn } from "@/lib/utils";

interface DataQuillProps {
  size?: number;
  className?: string;
}

export function DataQuill({ size = 36, className }: DataQuillProps) {
  const height = size;
  const width = size * 0.72;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 72 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-[#0f172a]", className)}
    >
      <defs>
        <linearGradient id="quillStroke" x1="0" y1="0" x2="72" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00b4d8" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="inkFill" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.85" />
          <stop offset="1" stopColor="#cbd5f5" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <path
        d="M8 70C8 42 34 14 52 4C59 0 64 0 64 0C64 0 64 6 62 14C56 36 36 70 20 86L8 98Z"
        fill="url(#inkFill)"
        stroke="url(#quillStroke)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M16 80L60 36"
        stroke="url(#quillStroke)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="84" r="6" fill="#0f172a" opacity="0.2" />
      <path
        d="M14 90C30 90 44 96 44 96L24 100H2L14 90Z"
        fill="#0f172a"
        opacity="0.15"
      />
    </svg>
  );
}
