import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Usa rolagem interna também no mobile (detalhes com cabeçalho fixo). */
  constrainMobileHeight?: boolean;
}

export default function PageContainer({
  children,
  className = "",
  constrainMobileHeight = false,
}: PageContainerProps) {
  // Item flex do `main`, em vez de `h-full`: a página recebe a altura que
  // sobra depois do banner, sem precisar saber que ele existe nem quanto ele
  // mede. `h-full` pedia 100% do `main` e ignorava o banner, estourando a
  // altura disponível.
  //
  // O `min-h-0` é só do desktop, e a assimetria é o ponto: com ele, a página
  // encolhe até caber e nada é cortado. No mobile a altura mínima segue sendo
  // a do conteúdo (`min-height: auto`), então o kanban empurra a página para
  // além da viewport e o `main` rola — que é como o banner sai da tela.
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
