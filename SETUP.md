# Pris-Appen Setup Guide

Complete setup instructions for getting the MVP running locally.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```

Start the backend:
```bash
npm run dev
```

You should see:
```
🚀 Pris-Appen API running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🇳🇴 Norwegian market context enabled
```

### 2. Mobile App Setup

Open a new terminal:

```bash
cd mobile
npm install
npm start
```

This will:
1. Start the Expo development server
2. Show a QR code in your terminal

### 3. Run on Your Phone

1. Open **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. Wait for the app to load (~30 seconds first time)
4. Grant camera permissions when prompted

### 4. Test the Flow

1. Tap "📸 Skann produkt"
2. Grant camera access
3. Scan any product barcode (or use test barcode: `7038010055604`)
4. Enter a price (e.g., `29.90`)
5. Tap "Evaluer pris"
6. See AI evaluation in ~2 seconds

## Testing Without a Physical Product

Use these Norwegian product barcodes for testing:

- **7038010055604** - Tine Melk (common dairy product)
- **7038010000379** - Tine Yoghurt
- **7311041028902** - Coca-Cola
- **5701184005408** - Arla Melk

## Troubleshooting

### Backend Issues

**"Cannot find module 'openai'"**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**"OPENAI_API_KEY is not set"**
- Check that `.env` file exists in `backend/` folder
- Verify the API key is valid
- Restart the backend server

**Port 3000 already in use**
- Change `PORT=3001` in `.env`
- Update `API_URL` in `mobile/app.json` to match

### Mobile Issues

**"Cannot connect to Metro"**
- Ensure your phone and computer are on the same WiFi
- Try running `npm start -- --tunnel` for tunnel mode
- Restart the Expo server

**"Network request failed"**
- Backend must be running on `http://localhost:3000`
- For physical devices, update `apiUrl` in `mobile/app.json`:
  ```json
  "extra": {
    "apiUrl": "http://YOUR_COMPUTER_IP:3000"
  }
  ```
- Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

**Camera not working**
- Grant camera permissions in phone settings
- Restart the Expo Go app
- Ensure good lighting when scanning

**Barcode not scanning**
- Hold phone steady, 10-15cm from barcode
- Ensure barcode is well-lit
- Try EAN-13 barcodes (most common in Norway)

## Development Workflow

### Making Changes

**Backend changes:**
- Edit files in `backend/src/`
- Server auto-restarts (via `tsx watch`)
- No manual restart needed

**Mobile changes:**
- Edit files in `mobile/app/` or `mobile/components/`
- App auto-refreshes in Expo Go
- Shake phone → "Reload" for manual refresh

### Viewing Logs

**Backend logs:**
- Visible in the terminal running `npm run dev`

**Mobile logs:**
- Shake phone → "Debug Remote JS"
- Or check terminal running `npm start`

## API Testing (Optional)

Test the backend directly with curl:

```bash
# Health check
curl http://localhost:3000/health

# Evaluate a price
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "7038010055604",
    "price": 29.90,
    "currency": "NOK"
  }'
```

Expected response:
```json
{
  "evaluation": "good",
  "explanation": "Dette er en god pris for Tine Melk...",
  "product": {
    "name": "Tine Helmelk",
    "brand": "Tine",
    "category": "Dairy"
  },
  "confidence": "medium",
  "barcode": "7038010055604",
  "price": 29.90,
  "currency": "NOK"
}
```

## Next Steps

Once everything works:

1. **Test with real products** - Visit a grocery store and scan items
2. **Check history** - Tap "📊 Se historikk" to see saved scans
3. **Adjust AI prompts** - Edit `backend/src/services/aiService.ts` to tune responses
4. **Customize UI** - Modify styles in `mobile/app/*.tsx` files

## Production Deployment

See `README.md` for deployment instructions to:
- Backend: Railway, Render, or Vercel
- Mobile: EAS Build → App Store/Play Store

## Cost Monitoring

Track OpenAI usage:
- Dashboard: https://platform.openai.com/usage
- Each scan costs ~$0.0002 (GPT-4o-mini)
- 1000 scans = ~$0.20

## Support

- **Open Food Facts API**: https://world.openfoodfacts.org/
- **Expo Docs**: https://docs.expo.dev/
- **OpenAI API**: https://platform.openai.com/docs/

## Norwegian Market Context

The AI is specifically tuned for Norwegian grocery prices:
- Understands Norwegian product names
- Considers Norwegian price levels (higher than EU average)
- Responds in Norwegian (bokmål)
- Knows common Norwegian brands (Tine, First Price, etc.)
