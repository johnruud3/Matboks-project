# Pris-Appen 🛒

AI-powered grocery price evaluation app for the Norwegian market.

## Project Overview

Pris-Appen helps Norwegian consumers make informed purchasing decisions by scanning product barcodes and receiving AI-powered price evaluations in real-time.

### Core Features (MVP)
- 📱 Barcode scanning
- 💰 Manual price input
- 🤖 AI-powered price evaluation
- 📊 Scan history
- 🇳🇴 Norwegian market context

## Tech Stack

### Mobile App
- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Key Libraries:**
  - `expo-barcode-scanner` - Barcode scanning
  - `expo-router` - File-based navigation
  - `@react-native-async-storage/async-storage` - Local history storage

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL (Supabase)
- **AI:** OpenAI API (GPT-4o-mini)
- **Product Data:** Open Food Facts API

## Project Structure

```
pris-appen/
├── mobile/                 # Expo mobile app
│   ├── app/               # Expo Router screens
│   ├── components/        # Reusable components
│   ├── services/          # API integration
│   ├── types/             # TypeScript types
│   └── utils/             # Helper functions
├── backend/               # Node.js API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helpers
│   │   └── types/        # TypeScript types
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app (iOS/Android)

### Mobile App Setup (Testing enviroment)

```bash
cd mobile
npx expo start
```

### Backend Setup

```bash
cd backend
npm run dev
```

### Mobile App Setup

```bash
cd mobile
npm install
npm start
```

Scan QR code with Expo Go to run on your device.

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

## Environment Variables

### Backend (.env)
```
PORT=3000
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgres_url
NODE_ENV=development
```

### Mobile (app.config.js)
```
API_URL=http://localhost:3000 (development)
API_URL=https://your-api.com (production)
```

## API Endpoints

### POST /api/evaluate
Evaluate a product price.

**Request:**
```json
{
  "barcode": "7038010055604",
  "price": 29.90,
  "currency": "NOK"
}
```

**Response:**
```json
{
  "evaluation": "good",
  "explanation": "Dette er en god pris. Basert på lignende produkter...",
  "product": {
    "name": "Tine Melk",
    "brand": "Tine",
    "category": "Meieriprodukter"
  },
  "confidence": "medium"
}
```

## Development Workflow

1. **Mobile-first:** Start Expo dev server, test on device
2. **Backend:** Run Express server locally
3. **Testing:** Use Expo Go for instant updates
4. **Deployment:** Backend to Railway/Render, mobile via EAS Build

## Deployment

### Backend
- **Recommended:** Railway or Render
- **Database:** Supabase (free tier)
- **Cost:** ~$5-10/month

### Mobile
- **Development:** Expo Go (free)
- **Production:** EAS Build → App Store/Play Store

## Cost Estimates (1000 active users)

- Backend hosting: $5/month
- Database: $0 (Supabase free tier)
- OpenAI API (5 scans/user): ~$1/month
- **Total: ~$6/month**

## Roadmap

### Phase 1: MVP (Current)
- ✅ Barcode scanning
- ✅ AI price evaluation
- ✅ Basic history
- ✅ Norwegian market context

### Phase 2: Enhancement
- Receipt scanning (OCR)
- Price history tracking
- Store comparisons
- User preferences

### Phase 3: Scale
- Crowdsourced pricing
- Premium features
- Advanced analytics
- Multi-market support

## Contributing

This is an MVP project. Focus on simplicity and user value over technical perfection.

## License

MIT
