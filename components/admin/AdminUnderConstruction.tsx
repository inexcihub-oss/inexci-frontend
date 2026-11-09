import { Hammer } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";

export function AdminUnderConstruction({ title }: { title: string }) {
  return (
    <PageContainer>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="border-b border-neutral-100 px-4 py-4 md:px-6">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Hammer className="h-10 w-10" aria-hidden="true" />}
            title="Em construção"
            description="Esta área do painel administrativo ainda está sendo construída."
          />
        </div>
      </div>
    </PageContainer>
  );
}
