# Pris-Appen Architecture

Technical architecture documentation for the MVP.

## System Overview

```
┌─────────────────┐
│   Mobile App    │  Expo (React Native)
│   (Expo Go)     │  - Barcode scanning
└────────┬────────┘  - Price input UI
         │           - Local history
         │ HTTP/JSON
         ▼
┌─────────────────┐
│   Backend API   │  Node.js + Express
│  (localhost)    │  - Product lookup
└────────┬────────┘  - AI orchestration
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  Open Food   │  │  OpenAI API  │
│    Facts     │  │ (GPT-4o-mini)│
│     API      │  │              │
└──────────────┘  └──────────────┘
```

## Data Flow

### 1. Scan Flow
```
User scans barcode
  → Camera captures EAN-13/UPC code
  → Navigate to result screen with barcode param
  → User enters price manually
  → Tap "Evaluer pris"
```

### 2. Evaluation Flow
```
Mobile App
  → POST /api/evaluate { barcode, price, currency }
    
Backend
  → Lookup product (Open Food Facts API)
  → Build AI prompt with Norwegian context
  → Call OpenAI API
  → Parse JSON response
  → Return evaluation
    
Mobile App
  → Display result with color coding
  → Save to AsyncStorage
  → Show in history
```

## Technology Stack

### Mobile (Expo)

**Core:**
- React Native 0.74
- Expo SDK 51
- TypeScript 5.3

**Key Libraries:**
- `expo-barcode-scanner` - Camera-based barcode scanning
- `expo-router` - File-based navigation
- `@react-native-async-storage/async-storage` - Local persistence

**Why Expo?**
- Instant testing via Expo Go (no builds needed)
- Excellent developer experience
- Built-in camera/barcode APIs
- Easy deployment via EAS

### Backend (Node.js)

**Core:**
- Node.js 18+
- Express 4.18
- TypeScript 5.3

**Key Libraries:**
- `openai` - OpenAI API client
- `cors` - Cross-origin requests
- `dotenv` - Environment config
- `tsx` - TypeScript execution (dev)

**Why Node.js?**
- Fast API development
- Shared language with frontend
- Excellent async/await support
- Easy deployment

### External Services

**Open Food Facts API**
- **Purpose:** Product metadata lookup
- **Endpoint:** `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Cost:** Free, no API key
- **Coverage:** 2M+ products globally
- **Response time:** ~200-500ms

**OpenAI API**
- **Purpose:** Price evaluation logic
- **Model:** GPT-4o-mini
- **Cost:** $0.15/1M input tokens, $0.60/1M output tokens
- **Typical request:** ~$0.0002 per evaluation
- **Response time:** ~800ms-2s

## API Design

### POST /api/evaluate

**Request:**
```typescript
{
  barcode: string;    // EAN-13, UPC-A, etc.
  price: number;      // Decimal price
  currency: string;   // "NOK" only for MVP
}
```

**Response:**
```typescript
{
  evaluation: 'good' | 'average' | 'expensive';
  explanation: string;  // Norwegian text, 2-3 sentences
  product: {
    name: string;
    brand?: string;
    category?: string;
    imageUrl?: string;
  };
  confidence: 'low' | 'medium' | 'high';
  barcode: string;
  price: number;
  currency: string;
}
```

**Error Responses:**
- `400` - Invalid request (missing fields, invalid price)
- `500` - Server error (AI failure, network issues)

## Data Storage

### Mobile (AsyncStorage)

**Key:** `@pris_appen_history`

**Structure:**
```typescript
ScanHistoryItem[] = [
  {
    id: string;           // Timestamp-based
    evaluation: string;
    explanation: string;
    product: Product;
    confidence: string;
    barcode: string;
    price: number;
    currency: string;
    timestamp: string;    // ISO 8601
  }
]
```

**Limits:**
- Max 100 items (FIFO)
- No sync, local-only
- Cleared on app uninstall

### Backend (None for MVP)

No database in MVP. Future phases will add:
- PostgreSQL for scan history
- User accounts
- Price history tracking
- Analytics

## AI Prompt Engineering

### System Prompt (Norwegian Context)

```
Du er en ekspert på norske dagligvarepriser.
Du hjelper forbrukere med å vurdere om en pris er god,
gjennomsnittlig eller dyr basert på det norske markedet.

Viktige retningslinjer:
- Vurder priser i kontekst av det norske markedet
- Ta hensyn til produktkategori, merkevare vs. butikkmerke
- Vær ærlig om usikkerhet
- Svar alltid på norsk
- Hold forklaringer korte (2-3 setninger)
```

### User Prompt Template

```
Vurder denne prisen i det norske dagligvaremarkedet:

Produkt: {product.name}
Merke: {product.brand}
Kategori: {product.category}
Pris: {price} {currency}

Er dette en god, gjennomsnittlig eller dyr pris? Forklar kort.
```

### Response Format (JSON)

```json
{
  "evaluation": "good",
  "explanation": "Dette er en god pris. Basert på...",
  "confidence": "medium"
}
```

## Security Considerations

### MVP (Current)

- ✅ CORS enabled (open for development)
- ✅ Input validation (price, currency, barcode)
- ✅ API key in environment variables
- ❌ No authentication (not needed for MVP)
- ❌ No rate limiting (add for production)

### Production (Future)

- Add rate limiting (per IP/user)
- Implement API authentication
- Add request logging
- Monitor OpenAI costs
- Restrict CORS to production domain

## Performance Targets

**Mobile App:**
- Initial load: <2s
- Barcode scan: <500ms
- Screen navigation: <100ms

**Backend API:**
- Product lookup: <500ms
- AI evaluation: <2s
- Total request: <3s

**Actual Performance (Measured):**
- Product lookup: ~300ms
- AI evaluation: ~1.2s
- Total: ~1.5s ✅

## Error Handling

### Mobile

**Network errors:**
- Show user-friendly alert
- Suggest checking internet connection
- Allow retry

**Camera errors:**
- Request permissions gracefully
- Show instructions
- Fallback to manual barcode entry (future)

### Backend

**Product not found:**
- Return "Ukjent produkt" placeholder
- Continue with AI evaluation
- Log for future improvement

**AI failure:**
- Return fallback response
- Log error for debugging
- Don't expose API errors to user

## Scalability Considerations

### Current Limits

- **Backend:** Single instance, no load balancing
- **Database:** None (AsyncStorage only)
- **Concurrent users:** ~10-50
- **Requests/second:** ~5-10

### Future Scaling

**Phase 1 (100+ users):**
- Add PostgreSQL database
- Implement caching (Redis)
- Add basic monitoring

**Phase 2 (1000+ users):**
- Horizontal scaling (multiple instances)
- CDN for static assets
- Rate limiting per user

**Phase 3 (10k+ users):**
- Microservices architecture
- Dedicated AI service
- Real-time price database

## Testing Strategy

### MVP Testing

**Manual testing:**
- Scan 10+ real products
- Test various price ranges
- Verify Norwegian responses
- Check history persistence

**Edge cases:**
- Unknown barcodes
- Invalid prices (0, negative)
- Network failures
- Camera permission denied

### Future Testing

- Unit tests (Jest)
- Integration tests (Supertest)
- E2E tests (Detox)
- Load testing (k6)

## Deployment Architecture

### Development

```
Mobile: Expo Go (local)
Backend: localhost:3000
Database: None
```

### Production

```
Mobile: EAS Build → App Store/Play Store
Backend: Railway/Render (containerized)
Database: Supabase (PostgreSQL)
Monitoring: Sentry, LogRocket
```

## Cost Breakdown (1000 active users, 5 scans/user/month)

| Service | Usage | Cost/Month |
|---------|-------|------------|
| OpenAI API | 5000 requests | $1.00 |
| Backend Hosting | Railway/Render | $5.00 |
| Database | Supabase free tier | $0.00 |
| **Total** | | **$6.00** |

## Norwegian Market Specifics

### Price Context

- Norway has 25% higher grocery prices than EU average
- Common price ranges (2024):
  - Milk (1L): 18-25 NOK
  - Bread: 25-40 NOK
  - Coca-Cola (1.5L): 25-35 NOK

### Common Brands

- **Tine** - Dairy products (premium)
- **First Price** - Budget brand (Rema 1000)
- **X-tra** - Budget brand (Coop)
- **Eldorado** - Budget brand (Norgesgruppen)

### Barcode Format

- EAN-13 (most common)
- Norwegian prefix: 70 (e.g., 7038010055604)

## Future Architecture Enhancements

### Phase 2 Features

- Receipt scanning (OCR)
- Price history graphs
- Store comparisons
- Push notifications

### Phase 3 Features

- Crowdsourced pricing
- ML-based price prediction
- Loyalty program integration
- Social features (share deals)

## Monitoring & Observability

### Current (MVP)

- Console logs only
- No error tracking
- No analytics

### Production

- **Error tracking:** Sentry
- **Analytics:** Mixpanel or Amplitude
- **Logs:** LogRocket or Datadog
- **Uptime:** UptimeRobot

## Compliance & Privacy

### GDPR Considerations

- No personal data collected in MVP
- Local-only storage (AsyncStorage)
- No user accounts
- No tracking

### Future Compliance

- Add privacy policy
- Implement data deletion
- Cookie consent (web version)
- Terms of service
