# Deploy — API Controle de Atividades Físicas

Guia para build, configuração e deploy em qualquer cluster Kubernetes/k3s.

---

## Arquitetura

```
Internet
  └─ Ingress Controller (Traefik)
       └─ atividadesfisicas-api.yuriprojects.dpdns.org → Service atividadesfisicas-api → Pod (:1350)
            └─ Service atividades-fisicas-db (PostgreSQL 17 :5432)
```

---


## 1. Pré-requisitos

- `kubectl` configurado apontando para o cluster alvo
- Docker com suporte a `buildx` (para build multi-plataforma amd64 + arm64)
- Conta no Docker Hub

---

## 2. Preparar os arquivos de configuração

```bash
cp deploy/prod/atividades-fisicas-configmap.example.yaml deploy/prod/atividades-fisicas-configmap.secret.yaml
cp deploy/prod/atividades-fisicas-secret.example.yaml    deploy/prod/atividades-fisicas-secret.secret.yaml
```

Preencha os valores. Para gerar senhas seguras:

```bash
openssl rand -hex 32     # POSTGRES_PASSWORD
openssl rand -base64 48  # BETTER_AUTH_SECRET
```

`DATABASE_URL` de produção:

```
postgresql://atividadefisicas:<POSTGRES_PASSWORD>@atividades-fisicas-db:5432/aplicativo_atividades_fisicas
```

---

## 3. Build e push da imagem Docker

O cluster roda em ARM64 — use `--platform linux/amd64,linux/arm64`.

**Configuração única (fazer uma vez):**

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

**Build e push:**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yurizetoles/atividades_fisicas_api:latest \
  --push .
```

---

## 4. Deploy — Produção (primeira vez)

```bash
kubectl apply -f deploy/prod/atividades-fisicas-namespace.yaml
kubectl apply -f deploy/prod/atividades-fisicas-configmap.secret.yaml
kubectl apply -f deploy/prod/atividades-fisicas-secret.secret.yaml
kubectl apply -f deploy/prod/atividades-fisicas-db.yaml

# Aguardar o banco ficar pronto
kubectl wait --for=condition=ready pod \
  -l io.kompose.service=atividades-fisicas-db \
  -n fabricaiv --timeout=120s

kubectl apply -f deploy/prod/atividades-fisicas-api.yaml
kubectl apply -f deploy/prod/atividades-fisicas-ingress.yaml
```

**Seed inicial (apenas uma vez):**

```bash
kubectl exec -n fabricaiv deployment/atividades-fisicas-api -- npm run seed
```

---

## 5. Atualizar a API (redeploy)

```bash
# 1. Construir e publicar nova imagem
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yurizetoles/atividades_fisicas_api:latest \
  --push .

# 2. Reiniciar o deployment no cluster
kubectl rollout restart deployment/atividades-fisicas-api -n fabricaiv
```

---

## 6. Verificar estado

```bash
kubectl get all -n fabricaiv
kubectl logs -f -n fabricaiv deployment/atividades-fisicas-api
```

---

## 7. Deletar recursos

**Apenas a API (preserva banco):**

```bash
kubectl delete -f deploy/prod/atividades-fisicas-ingress.yaml
kubectl delete -f deploy/prod/atividades-fisicas-api.yaml
```

**Tudo (inclusive banco e dados):**

```bash
kubectl delete namespace fabricaiv
```

---

## 8. CI/CD com GitLab Runner no cluster

O runner já está instalado no namespace `tools`. 
Aplique apenas o RBAC para conceder permissões no namespace `fabricaiv`:

```bash
kubectl apply -f deploy/runner/gitlab-runner-rbac.yaml
```

**Variáveis necessárias no GitLab (Settings → CI/CD → Variables):**

| Variável          | Protegida | Mascarada |
| ----------------- | --------- | --------- |
| `DOCKERHUB_USER`  | Não       | Não       |
| `DOCKERHUB_TOKEN` | Sim       | Sim       |
