# CivicConnect Deployment Guide

## 🚀 Production Deployment Guide

This guide will help you deploy CivicConnect to production with proper error handling, rate limiting, and scalability.

## 📋 Prerequisites

- Node.js 16+ installed
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account for image storage
- Domain name and hosting provider
- SSL certificate

## 🔧 Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Production Environment Configuration
NODE_ENV=production
PORT=5001

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/civicconnect?retryWrites=true&w=majority

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-for-production
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-super-secure-session-secret
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
NODE_ENV=production
REACT_APP_API_BASE=https://your-api-domain.com/api
REACT_APP_ML_BASE=https://your-ml-api-domain.com
GENERATE_SOURCEMAP=false
```

## 🏗️ Build Process

### Backend Build
```bash
cd backend
npm install
npm run prod
```

### Frontend Build
```bash
cd frontend
npm install
npm run build:prod
```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Frontend)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy frontend: `cd frontend && vercel --prod`
3. Configure environment variables in Vercel dashboard

### Option 2: Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build:prod`
3. Set publish directory: `build`
4. Configure environment variables

### Option 3: AWS/Google Cloud/Azure
1. Use containerization with Docker
2. Deploy using Kubernetes or Docker Compose
3. Use managed databases and CDN services

## 🐳 Docker Deployment

### Backend Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5001
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set secure JWT secrets
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] File upload restrictions

## 📊 Monitoring & Logging

### Recommended Tools
- **Application Monitoring**: New Relic, DataDog, or Sentry
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Log Management**: LogRocket or Papertrail
- **Error Tracking**: Sentry or Bugsnag

### Health Check Endpoints
- Backend: `GET /health`
- Frontend: Built-in React error boundaries

## 🚨 Error Handling

The application includes:
- Global error handlers
- Rate limiting (1000 requests per 15 minutes)
- Input validation
- Database connection pooling
- Graceful shutdown handling
- CORS protection
- Helmet security headers

## 📈 Performance Optimization

### Backend Optimizations
- Database connection pooling
- Compression middleware
- Request size limits
- Proper indexing
- Caching strategies

### Frontend Optimizations
- Code splitting
- Image optimization
- Bundle analysis
- CDN usage
- Service worker caching

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      - name: Build
        run: |
          cd frontend && npm run build:prod
      - name: Deploy
        run: |
          # Your deployment commands here
```

## 🆘 Troubleshooting

### Common Issues

1. **Rate Limiting Errors**
   - Increase `RATE_LIMIT_MAX_REQUESTS` in environment
   - Implement user-specific rate limiting
   - Use Redis for distributed rate limiting

2. **Database Connection Issues**
   - Check MongoDB connection string
   - Verify network connectivity
   - Check connection pool settings

3. **CORS Errors**
   - Update `CORS_ORIGIN` environment variable
   - Ensure frontend URL is included

4. **Build Failures**
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test endpoints individually
4. Monitor resource usage

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Database connected and indexed
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Error tracking configured
- [ ] Performance testing completed
- [ ] Security audit passed
- [ ] Documentation updated

---

**Note**: This deployment guide ensures your CivicConnect application is production-ready with proper error handling, rate limiting, and scalability features.
