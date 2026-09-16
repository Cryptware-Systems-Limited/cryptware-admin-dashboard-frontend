import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-[#0b2340]", className)}>
      <img
        src="/crypt-logo.jpeg"
        alt="Cryptware Systems logo"
        draggable={false}
        className="absolute max-w-none"
        style={{ width: "400%", height: "400%", left: "-150%", top: "-122%" }}
      />
    </div>
  );
}
