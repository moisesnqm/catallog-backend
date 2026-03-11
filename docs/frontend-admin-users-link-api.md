# Admin — Vinculação de usuários ao tenant (Frontend)

Este documento descreve a API e o fluxo para o frontend implementar a **vinculação e desvinculação de usuários ao tenant**. Apenas usuários com role **admin** podem acessar esses endpoints. O tenant é sempre o do usuário autenticado.

---

## 1. Objetivo

- Permitir que o **admin do tenant** vincule ao tenant usuários que já existem no Clerk (cadastrados por e-mail/Google, etc.).
- Permitir **listar** os usuários vinculados ao tenant e **desvincular** um usuário (remover o vínculo com o tenant; o usuário continua existindo no Clerk).
- Opcionalmente **alterar role e setor** de um usuário já vinculado.

O backend usa a **Clerk Backend API** para buscar o usuário pelo e-mail informado e criar o registro na tabela local. É necessário que o backend tenha `CLERK_SECRET_KEY` configurada para o link por e-mail funcionar.

---

## 2. Endpoints

Todos os endpoints abaixo exigem **autenticação** (`Authorization: Bearer <token>`) e **role admin**. O tenant é derivado do usuário autenticado.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/admin/users` | Lista usuários do tenant atual |
| POST | `/admin/users/link` | Vincula um usuário ao tenant pelo e-mail |
| PATCH | `/admin/users/by-clerk/:clerkUserId` | Atualiza role e/ou sector_access do usuário |
| DELETE | `/admin/users/by-clerk/:clerkUserId` | Desvincula o usuário do tenant |

**Base URL:** mesma da API (ex.: `https://api.example.com` ou `http://localhost:3001`). Enviar `Authorization: Bearer <token>` em toda requisição.

---

## 3. GET /admin/users — Listar usuários do tenant

Retorna a lista de usuários vinculados ao tenant do admin.

**Request**

- **Headers:** `Authorization: Bearer <clerk_jwt>`
- **Body:** nenhum

**Response — 200 OK**

Array de objetos no formato:

```ts
interface TenantUserItem {
  id: string;              // UUID do registro na aplicação
  clerk_user_id: string;   // ID do usuário no Clerk (ex.: user_2abc...)
  tenant_id: string;       // UUID do tenant
  role: string;            // 'admin' | 'manager' | 'viewer'
  sector_access: string;   // 'all' | 'none' | 'financeiro' | 'pcp' | 'producao' | 'vendas' | 'projeto'
  created_at: string;     // ISO 8601
}
```

**Erros**

- **401** — Token ausente ou inválido.
- **403** — Usuário não é admin.

---

## 4. POST /admin/users/link — Vincular usuário por e-mail

Vincula ao tenant atual um usuário que já existe no Clerk, identificado pelo **e-mail**. O backend consulta a Clerk Backend API; se encontrar o usuário, cria o registro local com o `clerk_user_id` retornado.

**Request**

- **Headers:** `Authorization: Bearer <clerk_jwt>`, `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "email": "usuario@exemplo.com",
  "role": "viewer",
  "sector_access": "all"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| email | string | Sim | E-mail do usuário no Clerk (formato válido) |
| role | string | Não | `admin` \| `manager` \| `viewer`. Default: `viewer` |
| sector_access | string | Não | `all` \| `none` \| `financeiro` \| `pcp` \| `producao` \| `vendas` \| `projeto`. Default: `all` |

**Response — 201 Created**

```ts
interface LinkUserResponse {
  id: string;
  clerk_user_id: string;
  tenant_id: string;
  role: string;
  sector_access: string;
}
```

**Erros**

- **401** — Token ausente ou inválido.
- **403** — Usuário não é admin.
- **404** — Nenhum usuário no Clerk com esse e-mail. Body: `{ "error": "No user found with this email" }`.
- **409** — Usuário já vinculado a este tenant. Body: `{ "error": "User already linked to this tenant" }`.
- **422** — Validação falhou (ex.: e-mail inválido). Body: `{ "error": "Validation failed", "details": { ... } }`.
- **503** — Link por e-mail não configurado no backend (falta `CLERK_SECRET_KEY`). Body: `{ "error": "Link by email is not configured; set CLERK_SECRET_KEY" }`.

---

## 5. PATCH /admin/users/by-clerk/:clerkUserId — Atualizar role/setor

Atualiza a **role** e/ou o **sector_access** de um usuário já vinculado ao tenant. O usuário alvo deve pertencer ao mesmo tenant do admin.

**Request**

- **Headers:** `Authorization: Bearer <clerk_jwt>`, `Content-Type: application/json`
- **Params:** `clerkUserId` — ID do usuário no Clerk (ex.: `user_2abc123`).
- **Body (JSON):** pelo menos um dos campos:

```json
{
  "role": "manager",
  "sector_access": "vendas"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| role | string | `admin` \| `manager` \| `viewer` |
| sector_access | string | `all` \| `none` \| `financeiro` \| `pcp` \| `producao` \| `vendas` \| `projeto` |

**Response — 200 OK**

Mesmo formato de um item da lista (id, clerk_user_id, tenant_id, role, sector_access).

**Erros**

- **401** — Token ausente ou inválido.
- **403** — Não é admin ou o usuário alvo é de outro tenant.
- **404** — Usuário não encontrado.
- **422** — Validação (body vazio ou valores inválidos).

---

## 6. DELETE /admin/users/by-clerk/:clerkUserId — Desvincular usuário

Remove o vínculo do usuário com o **tenant atual**. O usuário não é removido do Clerk; ele apenas deixa de ter acesso a este tenant na aplicação.

**Request**

- **Headers:** `Authorization: Bearer <clerk_jwt>`
- **Params:** `clerkUserId` — ID do usuário no Clerk (ex.: `user_2abc123`).
- **Body:** nenhum

**Response — 204 No Content**

Corpo vazio.

**Erros**

- **401** — Token ausente ou inválido.
- **403** — Usuário não é admin.
- **404** — Usuário não encontrado neste tenant. Body: `{ "error": "User not found in this tenant" }`.

---

## 7. Tipos TypeScript (resumo)

```ts
type Role = 'admin' | 'manager' | 'viewer';

type SectorAccess =
  | 'all'
  | 'none'
  | 'financeiro'
  | 'pcp'
  | 'producao'
  | 'vendas'
  | 'projeto';

interface TenantUserItem {
  id: string;
  clerk_user_id: string;
  tenant_id: string;
  role: Role;
  sector_access: SectorAccess;
  created_at: string;
}

interface LinkUserBody {
  email: string;
  role?: Role;
  sector_access?: SectorAccess;
}

interface UpdateUserRoleBody {
  role?: Role;
  sector_access?: SectorAccess;
}
```

---

## 8. Sugestões de UX para o frontend

1. **Página / seção “Usuários do tenant” (admin)**
   - Exibir apenas para usuários com role **admin** (usar dados de `GET /me`).
   - Listar usuários com `GET /admin/users` (ex.: tabela ou cards com id, clerk_user_id, role, sector_access, data de criação).
   - Para cada linha: botão **Desvincular** que chama `DELETE /admin/users/by-clerk/:clerkUserId` (usar o `clerk_user_id` da linha). Confirmar em um modal antes de desvincular.
   - Opcional: botão **Alterar role/setor** que abre um formulário e chama `PATCH /admin/users/by-clerk/:clerkUserId`.

2. **Formulário “Vincular usuário”**
   - Campo **E-mail** (obrigatório, tipo email).
   - Opcional: selects para **Role** (admin, manager, viewer) e **Setor** (all, none, financeiro, etc.), com valores padrão viewer e all.
   - Botão “Vincular” que envia `POST /admin/users/link` com `{ email, role?, sector_access? }`.
   - Tratar erros:
     - **404:** exibir “Nenhum usuário encontrado com este e-mail no Clerk. Verifique se o usuário já se cadastrou.”
     - **409:** exibir “Este usuário já está vinculado a este tenant.”
     - **503:** exibir “Vinculação por e-mail não está disponível no momento.”
     - **422:** exibir mensagens de validação (ex.: e-mail inválido).

3. **Onde obter o clerk_user_id**
   - Para listagem e desvincular, usar o campo `clerk_user_id` retornado por `GET /admin/users`. Não é necessário buscar em outro lugar.
   - O frontend não precisa exibir o `clerk_user_id` para o usuário final; pode mostrar apenas um identificador legível ou o e-mail (se o backend passar no futuro). Para o botão Desvincular, usar o `clerk_user_id` na URL do DELETE.

4. **Atualização da lista**
   - Após vincular com sucesso (201), adicionar o novo usuário à lista ou recarregar `GET /admin/users`.
   - Após desvincular (204), remover o item da lista ou recarregar a lista.

---

## 9. Resumo

- **GET /admin/users** — Lista usuários do tenant (admin).
- **POST /admin/users/link** — Vincula usuário ao tenant por e-mail (admin); requer `CLERK_SECRET_KEY` no backend.
- **PATCH /admin/users/by-clerk/:clerkUserId** — Atualiza role e/ou sector_access (admin).
- **DELETE /admin/users/by-clerk/:clerkUserId** — Desvincula usuário do tenant (admin).

Todos os endpoints são **admin only**; o tenant é sempre o do usuário autenticado. Tratar 404, 409 e 503 no fluxo de vinculação para uma boa experiência do usuário.
