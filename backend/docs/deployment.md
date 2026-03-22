# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Node.js v20+
- AWS CLI (for cloud deployment)

## Local Development

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Update .env with local values (or use provided defaults for local docker)
   ```

2. **Start Database**
   ```bash
   docker-compose up -d db
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Initialize Database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

## Docker Deployment (Production)

1. **Build Image**
   ```bash
   docker build -t eagle-foundry-backend .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     --env-file .env \
     eagle-foundry-backend
   ```

## Full-Stack Docker (Frontend + Backend + DB)

From the repository root:

```bash
docker compose up -d
```

- Frontend: http://localhost (port 80)
- Backend API: proxied at /api
- Database: PostgreSQL on port 5432

## CI/CD (GitHub Actions)

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `EC2_HOST` | EC2 instance hostname or IP |
| `EC2_USER` | SSH user (e.g. `ubuntu`) |
| `EC2_SSH_KEY` | Private key for SSH (full PEM content) |
| `PROD_ENV_FILE` | Production `.env` file contents (all variables) |
| `AWS_ACCESS_KEY_ID` | For Lambda deploy |
| `AWS_SECRET_ACCESS_KEY` | For Lambda deploy |
| `AWS_REGION` | e.g. `us-east-1` |
| `LAMBDA_FUNCTION_NAME` | OTP email consumer Lambda function name/ARN |

### EC2 Setup

1. Create `/opt/eagle-foundry` on the EC2 instance.
2. Ensure Docker and Docker Compose are installed.
3. Add the deploy key's public half to `~/.ssh/authorized_keys`.

## Cloud Infrastructure (AWS)

- **EC2**: Hosts Docker containers (frontend, backend, postgres).
- **RDS (Postgres)**: Optional; can use postgres container on EC2.
- **SQS/SNS**: Event bus for async tasks.
- **Lambda**: OTP email consumer (auto-deployed on `backend/lambda/**` changes).

### Environment Variables

Ensure all required variables defined in `.env.example` are set in the `.env.prod` file deployed to EC2 (via `PROD_ENV_FILE` secret).

**Required secrets (min lengths):** `OTP_HASH_PEPPER` (min 16 chars), `MFA_ENCRYPTION_KEY` (min 44 chars, 32-byte base64), `MFA_BACKUP_CODE_PEPPER` (min 16 chars), `FIELD_ENCRYPTION_HASH_PEPPER` (min 16 chars). `UPLOAD_TOKEN_SECRET` is optional but must be min 32 chars if provided.
