import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  uniColor?: boolean;
  /**
   * When true, adds a subtle light outline around the logo in dark mode
   * to improve visibility on dark backgrounds.
   */
  outlinedOnDark?: boolean;
};

export const Logo = ({ className, outlinedOnDark = true }: LogoProps) => {
  return (
    <span className={cn("inline-flex items-center", outlinedOnDark)}>
      <Image
        src="/images/logo.png"
        alt="Inexci"
        width={134}
        height={40}
        priority
        className={cn("h-10 w-auto block dark:hidden", className)}
      />

      <Image
        src="/images/logo-dark.png"
        alt="Inexci"
        width={134}
        height={40}
        priority
        className={cn("h-10 w-auto hidden dark:block", className)}
      />
    </span>
  );
};
