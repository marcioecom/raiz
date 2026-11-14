# Deploy da API (Fly.io + Neon)

Runbook da API Go em `api.marcio.run`. Banco no Neon, imagem no Fly.io, região `gru`.
Nada aqui é executado automaticamente: siga na ordem.

## 1. Banco no Neon

1. Crie um projeto no Neon em **`sa-east-1`** (São Paulo), Postgres 16.
2. Copie a connection string **direta** (host sem `-pooler`), com `sslmode=require`. Exemplo de formato:
   `postgres://USER:PASSWORD@ep-xxxx.sa-east-1.aws.neon.tech/DB?sslmode=require`
3. Guarde essa string: ela vira o segredo `DATABASE_URL` no passo 4.

> Pooled connection (`-pooler`) não é recomendada com pgx: o pooler em transaction mode
> não mantém prepared statements entre transações.

## 2. Segredos

Gere valores novos (nunca reaproveite os de `.env.example`):

```sh
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # PII_KEY
openssl rand -hex 32   # PARTNER_API_KEY (opcional)
```

- `JWT_SECRET`: mínimo 16 caracteres, assina o token de sessão.
- `PII_KEY`: mínimo 32 caracteres, deriva o hash do telefone (HMAC) e a cifra (AES-256-GCM). **Trocar depois invalida os telefones já gravados.**
- `PARTNER_API_KEY`: opcional; sem ela `GET /v1/offers` e `GET /v1/metrics/summary` respondem 404.

## 3. App no Fly.io

```sh
fly auth login
fly apps create raiz-api        # ajuste o nome se estiver tomado e atualize app = "..." no fly.toml
```

## 4. Secrets

```sh
fly secrets set \
  DATABASE_URL='<connection string direta do Neon>' \
  JWT_SECRET='<openssl rand -hex 32>' \
  PII_KEY='<openssl rand -hex 32>' \
  PARTNER_API_KEY='<openssl rand -hex 32>'   # opcional
```

Segredos nunca vão para o `fly.toml` nem para o repositório.

## 5. Deploy

```sh
fly deploy          # contexto de build = raiz do repositório
```

As migrações rodam no boot (`cmd/api` aplica as pendentes antes de subir o servidor).

## 6. Massa de demonstração

```sh
fly ssh console -C "/app/seed"
```

O `seed` é idempotente e roda migrações antes de inserir. É por isso que a imagem usa
`alpine` e não `distroless`: precisa de shell e de um binário executável via `fly ssh`.

## 7. Verificação pública

```sh
curl -i https://raiz-api.fly.dev/healthz     # 200
curl -i https://raiz-api.fly.dev/docs        # 200 (referência Scalar)
curl -i https://raiz-api.fly.dev/openapi.yaml # 200 (contrato)
curl -i https://raiz-api.fly.dev/            # 302 -> /docs
```

## 8. Domínio `api.marcio.run`

```sh
fly certs add api.marcio.run
fly certs show api.marcio.run   # mostra o valor do registro
```

No DNS de `marcio.run`, crie um `CNAME` de `api` apontando para `raiz-api.fly.dev`.
O certificado é emitido depois da propagação.

## 9. Logs

```sh
fly logs            # JSON estruturado (log/slog)
fly status
```

## Notas de operação

- **Migrações no boot:** qualquer deploy novo aplica o schema pendente antes de servir. Rollback de código não desfaz migração.
- **Neon free suspende por inatividade:** o primeiro request depois de ociosidade leva alguns segundos. Antes do pitch, aqueça com `curl https://api.marcio.run/healthz` (ou confira os logs).
- **`DEMO_MODE=true` só durante o evento:** mantém o OTP fixo `000000`. Depois do hackathon, troque para `false` no `[env]` do `fly.toml` e rode `fly deploy` (um secret de mesmo nome sobrescreve o `[env]`, se preferir não editar o arquivo).
- **`ALLOWED_ORIGINS=*` é temporário:** restrinja ao domínio do front quando `apps/web` estiver publicado.
- **Não use a connection string com `-pooler`** com pgx (prepared statements).
