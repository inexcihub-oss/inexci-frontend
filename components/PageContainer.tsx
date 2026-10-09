import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  constrainMobileHeight?: boolean;
}

export default function PageContainer({
  children,
  className = "",
  constrainMobileHeight = false,
}: PageContainerProps) {
  return (
    <div
      className={`flex flex-1 bg-white p-2 lg:p-2.5 lg:pl-0 lg:min-h-0 ${
        constrainMobileHeight ? "min-h-0" : ""
      }`}
    >
      <div
        className={`flex flex-col flex-1 border border-neutral-100 rounded-xl shadow-sm overflow-hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
