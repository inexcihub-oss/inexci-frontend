# Inexci Frontend

Frontend da aplicação Inexci desenvolvido em Next.js 14 com TypeScript e Tailwind CSS.

## 🚀 Como Rodar

### Com Docker (Recomendado)

```bash
# Na raiz do projeto (inexci-app/)
docker-compose up -d

# Ver logs do frontend
docker-compose logs -f frontend
```

### Sem Docker

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite NEXT_PUBLIC_API_URL=http://localhost:3000

# Iniciar em modo desenvolvimento
npm run dev
```

Acesse http://localhost:3001

## 📦 Comandos Úteis

```bash
# Desenvolvimento
npm run dev         # Iniciar com hot reload
npm run build       # Build para produção
npm run start       # Executar build de produção
npm run lint        # Verificar erros
```

## 🛠️ Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS
- **Axios** - Cliente HTTP
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

## 🏗️ Estrutura

```
inexci-frontend/
├── app/              # App Router (páginas e rotas)
├── components/       # Componentes React reutilizáveis
├── contexts/         # React Contexts (AuthContext, etc)
├── lib/              # Utilitários e configurações
├── services/         # Serviços de API
└── types/            # Tipos TypeScript
```
