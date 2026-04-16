"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-teal-700 md:text-9xl">404</h1>
        <h2 className="ds-page-title mt-4 text-gray-900">
          Página não encontrada
        </h2>
        <p className="mt-3 text-base text-[#758195]">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-8">
          <Link href="/dashboard" className="ds-btn inline-block">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
