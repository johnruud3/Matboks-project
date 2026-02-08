import OpenAI from 'openai';
import { Product, PriceEvaluation } from '../types/index.js';

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
  const prompt = buildPrompt(product, price, currency);

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du er en ekspert på norske dagligvarepriser. Du hjelper forbrukere med å vurdere om en pris er god, gjennomsnittlig eller dyr basert på det norske markedet.

Viktige retningslinjer:
- Vurder priser i kontekst av det norske markedet (Norge har generelt høyere priser enn mange andre land)
- Ta hensyn til produktkategori, merkevare vs. butikkmerke, og typiske prisnivåer
- Vær ærlig om usikkerhet - hvis du ikke har nok informasjon, si det
- Svar alltid på norsk
- Hold forklaringer korte og forbrukerrettede (2-3 setninger)
- Vær hjelpsom, ikke nedlatende

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

function buildPrompt(product: Product, price: number, currency: string): string {
  let prompt = `Vurder denne prisen i det norske dagligvaremarkedet:\n\n`;
  prompt += `Produkt: ${product.name}\n`;

  if (product.brand) {
    prompt += `Merke: ${product.brand}\n`;
  }

  if (product.category) {
    prompt += `Kategori: ${product.category}\n`;
  }

  prompt += `Pris: ${price} ${currency}\n\n`;
  prompt += `Er dette en god, gjennomsnittlig eller dyr pris? Forklar kort.`;

  return prompt;
}
