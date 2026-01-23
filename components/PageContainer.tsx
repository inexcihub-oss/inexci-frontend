import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className="flex bg-white p-2.5 pl-0 h-screen">
      <div
        className={`flex flex-col flex-1 border border-neutral-100 rounded-lg shadow-sm overflow-hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
