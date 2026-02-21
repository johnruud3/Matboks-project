import OpenAI from 'openai';

export interface FoodPhotoAnalysis {
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeFoodPhoto(imageBuffer: Buffer): Promise<FoodPhotoAnalysis> {
  const base64Image = imageBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Du er en ernæringsekspert. Analyser bildet av maten og:
1. Beskriv kort hva som er på tallerkenen (på norsk).
2. Estimer kalorier (kcal) for hele måltidet.
3. Estimer protein (gram), karbohydrater (gram) og fett (gram).

Returner KUN et JSON-objekt med denne strukturen, ingen annen tekst:
{"description": "kort beskrivelse på norsk", "estimatedCalories": tall, "estimatedProtein": tall, "estimatedCarbs": tall, "estimatedFat": tall}

Vær konservativ i estimatene. Bruk typiske porsjonsstørrelser.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyser dette måltidet og gi beskrivelse + makroestimater:' },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 400,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      description: String(parsed.description ?? 'Ukjent måltid'),
      estimatedCalories: Number(parsed.estimatedCalories) || 0,
      estimatedProtein: Number(parsed.estimatedProtein) || 0,
      estimatedCarbs: parsed.estimatedCarbs != null ? Number(parsed.estimatedCarbs) : undefined,
      estimatedFat: parsed.estimatedFat != null ? Number(parsed.estimatedFat) : undefined,
    };
  } catch {
    throw new Error('Failed to parse AI response');
  }
}
