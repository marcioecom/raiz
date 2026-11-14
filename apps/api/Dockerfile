# syntax=docker/dockerfile:1

# Build context is the repository root, not apps/api: the API serves
# docs/openapi.yaml and the contract must ship inside the image.
FROM golang:1.26-alpine AS build
WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux

# Dependencies first so source edits reuse the module cache layer.
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ ./
RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate \
 && go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

# Alpine instead of distroless: the demo runs `fly ssh console -C "/app/seed"`,
# which needs a shell and a command runner inside the image.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 10001 raiz

WORKDIR /app
COPY --from=build /out/api /out/migrate /out/seed /app/
COPY docs/openapi.yaml /app/docs/openapi.yaml

USER raiz
EXPOSE 8080
ENTRYPOINT ["/app/api"]
