# Usuários e roles (Clerk + backend)

O backend identifica usuários pelo **Clerk user ID** (`clerk_user_id`). Quem loga com Google (ou outro provider) pelo Clerk recebe um usuário no Clerk; para o backend autorizar esse usuário, ele precisa existir na tabela `users` com um `tenant_id` e uma `role`.

## Fluxo resumido

1. **Usuário loga no frontend** com Google (via Clerk) → Clerk cria/atualiza o usuário no Clerk.
2. **Backend** só aceita o token se existir um registro em `users` com aquele `clerk_user_id` e um `tenant_id`.
3. **Role e setor** são definidos no backend (tabela `users`: `role`, `sector_access`). Um **admin** pode alterar role/setor via API.

---

## 1. Fazer o usuário existir no backend

Há duas formas: **webhook do Clerk** (recomendado, automático) ou **criação manual** no banco.

### 1.1 Webhook do Clerk (recomendado)

Quando um usuário se registra ou loga pela primeira vez (ex.: com Google), o Clerk envia o evento `user.created` para o backend. Se o webhook estiver configurado, o backend cria o usuário na tabela `users` com um **tenant padrão** e **role/sector_access** iniciais, sem intervenção manual.

**Requisitos:**

1. **Criar o tenant padrão uma vez** (se ainda não existir):

   ```sql
   INSERT INTO tenants (id, name, created_at, updated_at)
   VALUES (gen_random_uuid(), 'Minha Empresa', now(), now());
   ```

   Anote o `id` do tenant.

2. **Variáveis de ambiente** (ver [.env.example](../.env.example)):
   - `CLERK_WEBHOOK_SIGNING_SECRET` — Signing Secret do endpoint (Clerk Dashboard → Webhooks → seu endpoint → Signing Secret).
   - `CLERK_WEBHOOK_DEFAULT_TENANT_ID` — UUID do tenant criado acima.
   - Opcional: `CLERK_WEBHOOK_DEFAULT_ROLE` (default `viewer`), `CLERK_WEBHOOK_DEFAULT_SECTOR_ACCESS` (default `all`).

3. **Clerk Dashboard — Webhooks:**
   - Add Endpoint → URL: `https://<seu-dominio-da-api>/webhooks/clerk`.
   - Subscribe to events: `user.created` e, se quiser, `user.deleted` e `user.updated`.
   - Copiar o Signing Secret → `CLERK_WEBHOOK_SIGNING_SECRET`.

Com isso, novos usuários (Google ou outro provider) passam a existir automaticamente no backend no tenant padrão. Um admin pode depois alterar role/setor via `PATCH /admin/users/by-clerk/:clerkUserId`.

### 1.2 Criação manual (sem webhook)

Se o webhook não estiver configurado, é preciso **criar o usuário manualmente** no banco.

#### Obter o Clerk User ID

- No [Clerk Dashboard](https://dashboard.clerk.com): **Users** → selecione o usuário que logou com Google → o **User ID** (ex.: `user_2abc...`) é o `clerk_user_id`.

#### Criar tenant (se ainda não existir)

```sql
INSERT INTO tenants (id, name, created_at, updated_at)
VALUES (gen_random_uuid(), 'Minha Empresa', now(), now());
```

Anote o `id` do tenant.

#### Inserir o usuário

Substitua `TENANT_ID`, `CLERK_USER_ID` e, se quiser, a role/sector_access:

```sql
INSERT INTO users (id, tenant_id, clerk_user_id, role, sector_access, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'TENANT_ID',           -- UUID do tenant
  'CLERK_USER_ID',       -- ex: user_2abc... do Clerk Dashboard
  'viewer',              -- role inicial: admin, manager ou viewer
  'all',                 -- sector_access inicial: all, none, ou um setor
  now(),
  now()
);
```

Depois disso, o usuário já consegue chamar a API com o token do Clerk (Bearer). A role/sector_access inicia com o que você definiu no `INSERT`.

---

## 2. Atualizar a role (e o setor) de um usuário

Um usuário com **role `admin`** pode alterar a role e o `sector_access` de qualquer usuário **do mesmo tenant** pela API.

### Endpoint

```http
PATCH /admin/users/by-clerk/:clerkUserId
Authorization: Bearer <token_do_admin>
Content-Type: application/json

{
  "role": "manager",
  "sector_access": "vendas"
}
```

- **`clerkUserId`**: mesmo User ID do Clerk (ex.: `user_2abc...`).
- **Body**: pelo menos um dos dois:
  - `role`: `"admin"` | `"manager"` | `"viewer"`
  - `sector_access`: `"all"` | `"none"` | `"financeiro"` | `"pcp"` | `"producao"` | `"vendas"` | `"projeto"`

Só quem tem **role `admin`** pode chamar esse endpoint. O usuário alvo precisa estar no mesmo tenant do admin; caso contrário a API retorna 403.

### Exemplo (curl)

```bash
curl -X PATCH "http://localhost:3001/admin/users/by-clerk/user_2abc123" \
  -H "Authorization: Bearer SEU_JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"role":"manager","sector_access":"vendas"}'
```

---

## Resumo: “Como atualizar a role de um usuário que logou com Google (Clerk)?”

1. **Fazer o usuário existir no backend:** use o **webhook** (recomendado; configurar endpoint `/webhooks/clerk` e variáveis no .env) ou crie manualmente com um `INSERT` em `users` usando o **Clerk User ID** e o `tenant_id` desejado.
2. **Trocar a role/setor depois:** um **admin** chama `PATCH /admin/users/by-clerk/:clerkUserId` com `role` e/ou `sector_access` no body.

O Clerk User ID é o mesmo para login com Google ou qualquer outro provider; o que importa no backend é que esse ID exista em `users` e pertença a um tenant.
