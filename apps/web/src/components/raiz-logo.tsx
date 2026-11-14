import { cn } from "@/lib/utils"

export interface RaizLogoProps {
  className?: string
  showWordmark?: boolean
}

export function RaizLogo({ className, showWordmark = true }: RaizLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden="true"
        className="h-7 w-7 shrink-0"
        fill="none"
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 16C14.8 10.5 18 6 23 4C19.5 6.8 16.2 11 15.2 16"
          stroke="#C8963E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
        <path
          d="M13.5 16C12 11.5 8.5 7.5 5 5.5C8 8.5 11.2 12 12.2 16.5"
          stroke="#C8963E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
        <path
          d="M14 16V25M14 20.5L9.5 24.5M14 20L18.5 24"
          stroke="#1F3A2E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
      {showWordmark && (
        <span className="text-[19px] font-bold leading-none tracking-wider text-forest">RAIZ</span>
      )}
    </div>
  )
}
