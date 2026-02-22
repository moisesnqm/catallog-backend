# Configuração do Clerk JWKS no backend

O backend valida o JWT de sessão do Clerk usando **JWKS** (JSON Web Key Set): baixa as chaves públicas no endpoint que você configurar e verifica a assinatura e o **issuer** do token.

## O que você precisa

Duas variáveis de ambiente (obrigatórias para rotas protegidas):

| Variável           | Descrição                                                                 |
|--------------------|---------------------------------------------------------------------------|
| `CLERK_JWKS_URL`   | URL do JWKS (conjunto de chaves públicas) do seu instance Clerk.        |
| `CLERK_ISSUER`     | Valor do claim `iss` do JWT (identificador do emissor do token).          |

Sem essas duas variáveis, qualquer request que passe pelo middleware de auth retorna **401** com mensagem de que é preciso configurar o Clerk.

---

## Onde obter no Clerk

### 1. Pelo Dashboard (recomendado)

1. Acesse [Clerk Dashboard](https://dashboard.clerk.com) e selecione sua aplicação.
2. Vá em **Configure** → **API Keys** (ou **Domains**).
3. Use o **Frontend API** (ou “Frontend API URL”) do seu instance:
   - Em desenvolvimento costuma ser algo como:  
     `https://<sua-instancia>.clerk.accounts.dev`
   - Em produção pode ser um domínio customizado, ex.:  
     `https://clerk.seudominio.com`

### 2. Montando as variáveis

Com o **domínio do Frontend API** (sem barra no final), defina:

```env
# Exemplo: instance em desenvolvimento
CLERK_JWKS_URL=https://<sua-instancia>.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://<sua-instancia>.clerk.accounts.dev

# Exemplo: domínio customizado em produção
# CLERK_JWKS_URL=https://clerk.seudominio.com/.well-known/jwks.json
# CLERK_ISSUER=https://clerk.seudominio.com
```

Regras importantes:

- **CLERK_JWKS_URL:** sempre termina em `/.well-known/jwks.json`.
- **CLERK_ISSUER:** mesmo domínio do JWKS, **sem** o path `/.well-known/jwks.json` (apenas a origem, ex. `https://...`).
- O valor de `iss` no JWT do Clerk deve ser **exatamente** igual a `CLERK_ISSUER`; caso contrário a verificação falha.

### 3. Alternativa: Backend API da Clerk

A Clerk também expõe um endpoint de JWKS no Backend API:

- `https://api.clerk.com/v1/jwks`

Esse endpoint pode exigir autenticação (ex.: `Authorization: Bearer <CLERK_SECRET_KEY>`). O código atual deste backend usa apenas uma URL pública de JWKS (sem header de auth). Por isso, a opção recomendada é usar o **Frontend API** + `/.well-known/jwks.json` como no exemplo acima.

Se no futuro você quiser usar `https://api.clerk.com/v1/jwks`, será necessário ajustar o código para enviar o header de autorização na requisição ao JWKS.

---

## Verificação rápida

1. Coloque `CLERK_JWKS_URL` e `CLERK_ISSUER` no `.env`.
2. Reinicie o backend.
3. Envie um request com um token válido do Clerk no header:
   ```http
   Authorization: Bearer <session_token_do_clerk>
   ```
4. Se a configuração estiver correta, o backend valida o token e segue o fluxo normal (tenant, role, sector_access, etc.). Se algo estiver errado, você recebe **401** (e a mensagem pode indicar token inválido ou que JWKS/issuer não estão configurados).

---

## Resumo

- **CLERK_JWKS_URL:** URL pública do JWKS do seu instance (ex.: Frontend API + `/.well-known/jwks.json`).
- **CLERK_ISSUER:** mesmo domínio do emissor do JWT (ex.: Frontend API sem path).
- Obtenha o domínio do Frontend API no Dashboard da Clerk (API Keys / Domains) e monte as duas variáveis como nos exemplos acima.
