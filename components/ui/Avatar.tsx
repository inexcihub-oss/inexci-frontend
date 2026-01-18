import Image from "next/image";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size === "sm" ? 32 : size === "md" ? 40 : 48}
        height={size === "sm" ? 32 : size === "md" ? 40 : 48}
        className={cn("rounded-lg object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-semibold",
        sizeClasses[size],
        getAvatarColor(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
