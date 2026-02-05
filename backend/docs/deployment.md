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

## Cloud Infrastructure (AWS)

- **ECS/Fargate**: Host the Docker container.
- **RDS (Postgres)**: Database instance.
- **ElastiCache (Redis)**: Optional for caching/rate limiting.
- **SQS/SNS**: Event bus for async tasks.
- **Lambda**: Consumers for SQS events (emails, etc.).

### Environment Variables
Ensure all required variables defined in `.env.example` are set in the ECS Task Definition or Parameter Store.
