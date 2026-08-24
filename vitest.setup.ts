import "@testing-library/jest-dom/vitest";

// Node 25 expõe um `globalThis.localStorage` próprio, porém sem a API de
// Storage quando não recebe `--localstorage-file`. Ele também sombreia o
// storage que o jsdom tentaria expor. A suíte usa este armazenamento em
// memória explícito para manter o contrato do navegador independente da
// versão do Node que executa o Vitest.
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const localStorageMock = createMemoryStorage();
const sessionStorageMock = createMemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: sessionStorageMock,
});
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});
Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  value: sessionStorageMock,
});
