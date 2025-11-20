# Shrig Backend - High-Performance API & Real-time Data Processing

## API Endpoints

### Orders API

```http
GET    /api/v1/orders              # Paginated order list
GET    /api/v1/orders/:id          # Single order details
GET    /api/v1/orders/stats        # Order statistics (cached)
GET    /api/v1/orders/search       # Full-text search
POST   /api/v1/orders              # Create orders (batch support)
```

### Real-time Data API

```http
POST   /api/v1/data/ingest         # Data ingestion endpoint
GET    /api/v1/data/stats          # Real-time statistics
GET    /api/v1/data/history        # Historical data with filters
WS     /ws                         # WebSocket connection
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd shrig-backend

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Configure MongoDB and Redis connections

# Seed database with test data
npm run seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shrig_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Performance
CACHE_TTL=300
QUEUE_CONCURRENCY=5
```

## 🧪 Testing & Performance

### Comprehensive Test Suite

```bash
# Run all tests
npm test
```

## Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── repositories/    # Database access layer
├── models/          # MongoDB schemas with indexes
├── routes/          # API route definitions
├── middleware/      # Custom middleware (auth, cache, validation)
├── jobs/            # Background job processors
├── config/          # Database and Redis configuration
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
└── database/        # Database seeds and utilities

tests/
└── performance/     # Performance and load tests
```
