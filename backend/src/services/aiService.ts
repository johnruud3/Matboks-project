import OpenAI from 'openai';
import { Product, PriceEvaluation } from '../types/index.js';
import { getPriceStats } from './databaseService.js';

let openai: OpenAI;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface EvaluationResult {
  evaluation: 'good' | 'average' | 'expensive';
  explanation: string;
  confidence: 'low' | 'medium' | 'high';
}

export async function evaluatePrice(
  product: Product,
  price: number,
  currency: string,
  barcode: string
): Promise<PriceEvaluation> {
  // Fetch crowdsourced price data if available
  let priceStats = null;
  try {
    priceStats = await getPriceStats(barcode);
  } catch (error) {
    console.log('No community price data available for this product');
  }

  const prompt = buildPrompt(product, price, currency, priceStats);

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du er en prisekspert i en app som hjelper norske forbrukere med å finne gode priser. Du vurderer om en pris er god, gjennomsnittlig eller dyr.

SPRÅK OG TONE:
- Snakk som en vennlig rådgiver, aldri teknisk
- ALDRI nevn API-er, databaser, Kassal.app, eller andre tekniske systemer
- Referer til prisdata som "prisene vi har", "ifølge vår prisdata", eller "basert på det vi ser i butikkene"
- Referer til brukerinnsendte priser som "det andre brukere har rapportert" eller "prisene folk har delt"
- Hold forklaringer korte og enkle (2-3 setninger)
- Svar alltid på norsk
- Vær hjelpsom og positiv, ikke nedlatende

EVALUERINGSKRITERIER:
- Analyser produktkategori (meieri, snacks, drikke, etc.) og typiske prisnivåer
- Vurder merkevareposisjonering (premium vs. butikkmerke)
- Ta hensyn til norsk markedskontekst (Norge har generelt høyere priser)
- Hvis butikkpris er oppgitt, bruk den som primærreferanse
- Vær ærlig om usikkerhet - si det enkelt hvis du ikke har nok info

VIKTIGE PRODUKTKATEGORIER:
- Tobakk/snus: Prisen gjelder ALLTID per boks/pakke. En boks snus koster typisk 80-120 kr.
  Ikke anta multipakk med mindre produktnavnet eksplisitt sier det.
- Drikkevarer: Prisen gjelder per flaske/boks med mindre annet er spesifisert.
  Husk pant (2-3 kr) er ofte inkludert.
- Godteri/snacks: Prisen gjelder per pose/pakke, ikke per kilo.
- Prisen brukeren oppgir er ALLTID for én enkelt enhet av produktet.

CONFIDENCE NIVÅER:
- "high": 10+ brukere har delt priser
- "medium": 3-9 brukere har delt priser
- "low": 0-2 brukere har delt priser, basert mest på estimater

Returner alltid et JSON-objekt med denne strukturen:
{
  "evaluation": "good" | "average" | "expensive",
  "explanation": "kort forklaring på norsk",
  "confidence": "low" | "medium" | "high"
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result: EvaluationResult = JSON.parse(content);

    return {
      evaluation: result.evaluation,
      explanation: result.explanation,
      product,
      confidence: result.confidence,
      barcode,
      price,
      currency,
    };
  } catch (error) {
    console.error('AI evaluation failed:', error);

    return {
      evaluation: 'average',
      explanation: 'Kunne ikke evaluere prisen akkurat nå. Prøv igjen senere.',
      product,
      confidence: 'low',
      barcode,
      price,
      currency,
    };
  }
}

function buildPrompt(
  product: Product,
  price: number,
  currency: string,
  priceStats: any
): string {
  let prompt = `Vurder denne prisen i det norske dagligvaremarkedet:\n\n`;
  prompt += `Produkt: ${product.name}\n`;

  if (product.brand) {
    prompt += `Merke: ${product.brand}\n`;
  }

  if (product.category) {
    prompt += `Kategori: ${product.category}\n`;
  }

  prompt += `Pris: ${price} ${currency}\n`;

  if (product.currentPrice) {
    prompt += `Butikkpris (verifisert): ${product.currentPrice} ${currency}\n`;
  }

  prompt += `\n`;

  // Add community price data if available
  if (priceStats) {
    prompt += `FELLESSKAPSPRISER (fra ${priceStats.submission_count} brukere):\n`;
    prompt += `- Gjennomsnitt: ${priceStats.avg_price} ${currency}\n`;
    prompt += `- Laveste: ${priceStats.min_price} ${currency}\n`;
    prompt += `- Høyeste: ${priceStats.max_price} ${currency}\n`;
    prompt += `- Sist oppdatert: ${new Date(priceStats.last_updated).toLocaleDateString('nb-NO')}\n\n`;
    prompt += `Bruk disse dataene som hovedreferanse, men vurder også:\n`;
    prompt += `- Produktkategori og typiske prisnivåer\n`;
    prompt += `- Merkevareposisjonering (premium/standard/budsjett)\n`;
    prompt += `- Norsk markedskontekst\n\n`;
  } else {
    prompt += `INGEN FELLESSKAPSPRISER TILGJENGELIG\n`;
    prompt += `Vurder basert på:\n`;
    prompt += `- Produktkategori og typiske norske prisnivåer\n`;
    prompt += `- Merkevareposisjonering\n`;
    prompt += `- Generell markedskunnskap\n\n`;
  }

  prompt += `Er dette en god, gjennomsnittlig eller dyr pris? Forklar kort.`;

  return prompt;
}
