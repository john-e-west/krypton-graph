# Deployment Guide
## Krypton-Graph Production Deployment

**Version:** 1.0  
**Date:** September 2025  
**Audience:** DevOps Engineers, System Administrators

---

## 1. Prerequisites

### 1.1 System Requirements

#### Minimum Hardware
- **CPU**: 4 cores (2.4 GHz+)
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

#### Recommended Hardware
- **CPU**: 8 cores (3.0 GHz+)
- **RAM**: 16 GB
- **Storage**: 200 GB SSD
- **Network**: 1 Gbps

### 1.2 Software Requirements
- **Operating System**: Ubuntu 20.04 LTS or later
- **Docker**: 20.10+ with Docker Compose 2.0+
- **Node.js**: 16.0+ (for admin UI)
- **Python**: 3.11+ (for backend services)
- **PostgreSQL**: 15+ (future migration from AirTable)
- **Redis**: 7.0+ (for caching)
- **Nginx**: 1.21+ (for reverse proxy)

### 1.3 External Services
- **AirTable Account** with API access
- **Zep Cloud Account** with API key
- **SSL Certificate** (Let's Encrypt or commercial)
- **Domain Name** with DNS control
- **Email Service** (SendGrid/AWS SES for notifications)

---

## 2. Environment Setup

### 2.1 Create Deployment User
```bash
# Create krypton user
sudo adduser krypton --disabled-password
sudo usermod -aG docker krypton
sudo su - krypton
```

### 2.2 Directory Structure
```bash
# Create application directories
mkdir -p /opt/krypton-graph/{backend,frontend,data,logs,config}
cd /opt/krypton-graph

# Set permissions
sudo chown -R krypton:krypton /opt/krypton-graph
chmod 755 /opt/krypton-graph
```

### 2.3 Environment Variables
Create `/opt/krypton-graph/config/.env`:
```bash
# Core Configuration
NODE_ENV=production
ENVIRONMENT=production
APP_NAME=krypton-graph
APP_URL=https://krypton-graph.example.com
API_URL=https://api.krypton-graph.example.com

# AirTable Configuration
AIRTABLE_API_KEY=pat.xxxxxxxxxxxxx
AIRTABLE_BASE_ID=appvLsaMZqtLc9EIX

# Zep Configuration
ZEP_API_KEY=z_xxxxxxxxxxxxx
ZEP_API_URL=https://api.getzep.com

# Database Configuration (Future PostgreSQL)
DATABASE_URL=postgresql://krypton:password@localhost:5432/krypton_prod
DATABASE_POOL_SIZE=20

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_MAX_CONNECTIONS=50

# Security
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
JWT_EXPIRY=3600
ENCRYPTION_KEY=your-encryption-key-32-bytes
CORS_ORIGINS=https://krypton-graph.example.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
METRICS_ENABLED=true

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@krypton-graph.example.com

# Rate Limiting
RATE_LIMIT_WINDOW=3600
RATE_LIMIT_MAX_REQUESTS=1000
```

---

## 3. Docker Deployment

### 3.1 Docker Compose Configuration
Create `/opt/krypton-graph/docker-compose.yml`:
```yaml
version: '3.8'

services:
  # API Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: krypton-api
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./config/.env
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - krypton-network

  # Admin UI Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_API_URL=https://api.krypton-graph.example.com
    container_name: krypton-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/nginx.conf:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - krypton-network

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: krypton-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=krypton_prod
      - POSTGRES_USER=krypton
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./config/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U krypton"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - krypton-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: krypton-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - krypton-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:1.21-alpine
    container_name: krypton-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - api
      - frontend
    networks:
      - krypton-network

volumes:
  postgres-data:
  redis-data:

networks:
  krypton-network:
    driver: bridge
```

### 3.2 Backend Dockerfile
Create `/opt/krypton-graph/backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY app.py .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check script
COPY health_check.py .

EXPOSE 5000

CMD ["gunicorn", "app:app", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
```

### 3.3 Frontend Dockerfile
Create `/opt/krypton-graph/frontend/Dockerfile`:
```dockerfile
# Build stage
FROM node:16-alpine as builder

WORKDIR /app

# Copy package files
COPY admin-ui/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY admin-ui/ .

# Build application
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build

# Production stage
FROM nginx:1.21-alpine

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Kubernetes Deployment

### 4.1 Namespace and ConfigMap
Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: krypton-graph
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: krypton-config
  namespace: krypton-graph
data:
  NODE_ENV: "production"
  API_URL: "https://api.krypton-graph.example.com"
  LOG_LEVEL: "info"
```

### 4.2 Secret Configuration
Create `k8s/secrets.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: krypton-secrets
  namespace: krypton-graph
type: Opaque
stringData:
  AIRTABLE_API_KEY: "pat.xxxxxxxxxxxxx"
  ZEP_API_KEY: "z_xxxxxxxxxxxxx"
  JWT_SECRET: "your-very-long-random-secret-key"
  DATABASE_PASSWORD: "your-database-password"
  REDIS_PASSWORD: "your-redis-password"
```

### 4.3 API Deployment
Create `k8s/api-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krypton-api
  namespace: krypton-graph
spec:
  replicas: 3
  selector:
    matchLabels:
      app: krypton-api
  template:
    metadata:
      labels:
        app: krypton-api
    spec:
      containers:
      - name: api
        image: krypton-graph/api:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: krypton-config
        - secretRef:
            name: krypton-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: krypton-api-service
  namespace: krypton-graph
spec:
  selector:
    app: krypton-api
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
```

### 4.4 Frontend Deployment
Create `k8s/frontend-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krypton-frontend
  namespace: krypton-graph
spec:
  replicas: 2
  selector:
    matchLabels:
      app: krypton-frontend
  template:
    metadata:
      labels:
        app: krypton-frontend
    spec:
      containers:
      - name: frontend
        image: krypton-graph/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: krypton-frontend-service
  namespace: krypton-graph
spec:
  selector:
    app: krypton-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### 4.5 Ingress Configuration
Create `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: krypton-ingress
  namespace: krypton-graph
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - krypton-graph.example.com
    - api.krypton-graph.example.com
    secretName: krypton-tls
  rules:
  - host: krypton-graph.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: krypton-frontend-service
            port:
              number: 80
  - host: api.krypton-graph.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: krypton-api-service
            port:
              number: 5000
```

---

## 5. Cloud Platform Deployment

### 5.1 AWS Deployment

#### ECS Task Definition
```json
{
  "family": "krypton-graph",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "krypton-api",
      "image": "your-ecr-repo/krypton-api:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "AIRTABLE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:krypton/airtable"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/krypton-graph",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

#### CloudFormation Template (excerpt)
```yaml
Resources:
  KryptonALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: krypton-alb
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup

  KryptonTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: krypton-tg
      Port: 5000
      Protocol: HTTP
      VpcId: !Ref VPC
      TargetType: ip
      HealthCheckPath: /health

  KryptonECSService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: krypton-graph
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 3
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
          SecurityGroups:
            - !Ref ECSSecurityGroup
      LoadBalancers:
        - ContainerName: krypton-api
          ContainerPort: 5000
          TargetGroupArn: !Ref KryptonTargetGroup
```

### 5.2 Azure Deployment

#### Azure Container Instances
```bash
# Create resource group
az group create --name krypton-rg --location eastus

# Create container registry
az acr create --resource-group krypton-rg \
  --name kryptonregistry --sku Basic

# Deploy container instance
az container create \
  --resource-group krypton-rg \
  --name krypton-api \
  --image kryptonregistry.azurecr.io/krypton-api:latest \
  --cpu 2 --memory 4 \
  --ports 5000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables \
    AIRTABLE_API_KEY=$AIRTABLE_API_KEY \
    ZEP_API_KEY=$ZEP_API_KEY
```

### 5.3 Google Cloud Platform

#### Cloud Run Deployment
```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT-ID/krypton-api

# Deploy to Cloud Run
gcloud run deploy krypton-api \
  --image gcr.io/PROJECT-ID/krypton-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets AIRTABLE_API_KEY=airtable-key:latest \
  --min-instances 1 \
  --max-instances 10 \
  --memory 2Gi \
  --cpu 2
```

---

## 6. SSL/TLS Configuration

### 6.1 Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d krypton-graph.example.com -d api.krypton-graph.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 6.2 Nginx SSL Configuration
Create `/opt/krypton-graph/config/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=app:10m rate=30r/s;

    # Upstream servers
    upstream api_backend {
        least_conn;
        server api:5000 max_fails=3 fail_timeout=30s;
    }

    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name krypton-graph.example.com api.krypton-graph.example.com;
        return 301 https://$server_name$request_uri;
    }

    # Main application
    server {
        listen 443 ssl http2;
        server_name krypton-graph.example.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            limit_req zone=app burst=20 nodelay;
        }
    }

    # API server
    server {
        listen 443 ssl http2;
        server_name api.krypton-graph.example.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            limit_req zone=api burst=5 nodelay;
        }
    }
}
```

---

## 7. Database Migration

### 7.1 PostgreSQL Setup
```sql
-- Create database and user
CREATE DATABASE krypton_prod;
CREATE USER krypton WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE krypton_prod TO krypton;

-- Create schema
\c krypton_prod;

CREATE TABLE ontologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    metadata JSONB,
    INDEX idx_domain (domain),
    INDEX idx_status (status)
);

-- Add other tables...
```

### 7.2 Data Migration from AirTable
```python
# migration_script.py
import os
from airtable import Airtable
import psycopg2
from psycopg2.extras import Json

# Connect to AirTable
airtable = Airtable(
    base_id=os.environ['AIRTABLE_BASE_ID'],
    api_key=os.environ['AIRTABLE_API_KEY']
)

# Connect to PostgreSQL
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Migrate ontologies
ontologies = airtable.table('Ontologies').all()
for record in ontologies:
    fields = record['fields']
    cur.execute("""
        INSERT INTO ontologies (name, domain, version, status, description, metadata)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        fields.get('Name'),
        fields.get('Domain'),
        fields.get('Version', '1.0.0'),
        fields.get('Status', 'Draft'),
        fields.get('Description'),
        Json(fields.get('Metadata', {}))
    ))

conn.commit()
conn.close()
```

---

## 8. Monitoring Setup

### 8.1 Prometheus Configuration
Create `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'krypton-api'
    static_configs:
      - targets: ['api:5000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### 8.2 Grafana Dashboard
Import dashboard JSON from `/opt/krypton-graph/config/grafana-dashboard.json`

Key metrics to monitor:
- API response times
- Request rates
- Error rates
- Database connections
- Cache hit rates
- Graph operation durations
- Test execution times

---

## 9. Backup and Recovery

### 9.1 Automated Backups
Create `/opt/krypton-graph/scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backup/krypton-graph"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Backup application data
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /opt/krypton-graph/data

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/krypton-graph/config

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql s3://krypton-backups/
aws s3 cp $BACKUP_DIR/data_$DATE.tar.gz s3://krypton-backups/
aws s3 cp $BACKUP_DIR/config_$DATE.tar.gz s3://krypton-backups/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
```

### 9.2 Recovery Procedure
```bash
# Restore database
psql $DATABASE_URL < backup.sql

# Restore application data
tar -xzf data_backup.tar.gz -C /

# Restore configuration
tar -xzf config_backup.tar.gz -C /

# Restart services
docker-compose restart
```

---

## 10. Health Checks

### 10.1 Application Health Check
```python
# health_check.py
@app.route('/health')
def health_check():
    checks = {
        'api': True,
        'database': check_database(),
        'redis': check_redis(),
        'airtable': check_airtable(),
        'zep': check_zep()
    }
    
    status_code = 200 if all(checks.values()) else 503
    
    return jsonify({
        'status': 'healthy' if all(checks.values()) else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.now().isoformat()
    }), status_code
```

### 10.2 Monitoring Script
```bash
#!/bin/bash
# monitor.sh
while true; do
    # Check API health
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.krypton-graph.example.com/health)
    
    if [ $API_STATUS -ne 200 ]; then
        echo "API unhealthy: $API_STATUS"
        # Send alert
        curl -X POST $SLACK_WEBHOOK -d '{"text":"API Health Check Failed"}'
    fi
    
    sleep 60
done
```

---

## 11. Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured
- [ ] Load testing completed

### Deployment Steps
1. [ ] Deploy database and cache services
2. [ ] Run database migrations
3. [ ] Deploy backend API
4. [ ] Deploy frontend application
5. [ ] Configure reverse proxy
6. [ ] Enable SSL/TLS
7. [ ] Verify health checks
8. [ ] Enable monitoring
9. [ ] Test critical workflows
10. [ ] Enable auto-scaling

### Post-Deployment
- [ ] Verify all services running
- [ ] Check application logs
- [ ] Test user authentication
- [ ] Verify API endpoints
- [ ] Test WebSocket connections
- [ ] Monitor performance metrics
- [ ] Document deployment details

---

## 12. Troubleshooting

### Common Issues

#### API Connection Refused
```bash
# Check if API is running
docker ps | grep krypton-api

# Check logs
docker logs krypton-api

# Test connectivity
curl http://localhost:5000/health
```

#### Database Connection Failed
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart api

# Adjust memory limits in docker-compose.yml
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /etc/nginx/ssl/fullchain.pem -noout -dates

# Renew certificate
certbot renew --nginx

# Restart Nginx
systemctl restart nginx
```

---

## Support

For deployment support:
- Documentation: https://docs.krypton-graph.com/deployment
- Issues: https://github.com/krypton-graph/issues
- Email: devops@krypton-graph.com

---

**Document Version:** 1.0  
**Last Updated:** September 2025