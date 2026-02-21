import OpenAI from 'openai';

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'gå ned i vekt',
  maintain: 'beholde vekt',
  gain_weight: 'gå opp i vekt',
  build_muscle: 'bygge muskler',
};

export interface CoachAdviceRequest {
  goals: {
    goalType: string;
    heightCm?: number;
    weightKg?: number;
    age?: number;
    gender?: string;
    targetWeightKg?: number;
  };
  logEntries: Array<{ name: string; calories: number; protein: number }>;
  /** Valgfritt: brukerens konkrete spørsmål. Hvis satt, svarer coach på spørsmålet med kontekst av mål + logg. */
  question?: string;
}

export interface CoachRecipe {
  name: string;
  steps: string[];
  /** Estimated kcal for the full recipe (one serving typical). */
  calories?: number;
  /** Estimated protein in grams. */
  protein?: number;
  /** Estimated fat in grams. */
  fat?: number;
}

export interface CoachAdviceResult {
  advice: string;
  recipe?: CoachRecipe | null;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getCoachAdvice(req: CoachAdviceRequest): Promise<CoachAdviceResult> {
  const g = req.goals ?? {};
  const goalLabel = GOAL_LABELS[g.goalType] ?? 'spise sunt';
  const totalCal = req.logEntries.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = req.logEntries.reduce((s, e) => s + (e.protein || 0), 0);
  const items =
    req.logEntries.length > 0
      ? req.logEntries.map((e) => `- ${e.name}: ${e.calories} kcal, ${e.protein} g protein`).join('\n')
      : 'Ingen mat logget i dag ennå.';

  const profileParts: string[] = [];
  if (g.heightCm) profileParts.push(`Høyde: ${g.heightCm} cm`);
  if (g.weightKg) profileParts.push(`Vekt: ${g.weightKg} kg`);
  if (g.targetWeightKg) profileParts.push(`Målvekt: ${g.targetWeightKg} kg`);
  if (g.age) profileParts.push(`Alder: ${g.age} år`);
  if (g.gender) profileParts.push(`Kjønn: ${g.gender === 'male' ? 'mann' : g.gender === 'female' ? 'kvinne' : 'annet'}`);
  const profileLine = profileParts.length > 0 ? `\nBrukerprofil: ${profileParts.join(', ')}.` : '';

  const contextBlock = `Brukerens inntak i dag så langt:
${items}

Totalt i dag: ${totalCal} kcal, ${totalProtein} g protein.`;

  const hasQuestion = typeof req.question === 'string' && req.question.trim().length > 0;

  if (hasQuestion) {
    const prompt = `Du er en vennlig AI mat-coach. Brukerens mål: ${goalLabel}.${profileLine}

${contextBlock}

Brukeren spør: «${req.question!.trim()}»

Svar på spørsmålet på norsk. Hvis spørsmålet handler om HVORDAN LAGE noe (oppskrift, fremgangsmåte, frokost, måltid), gi også en strukturert oppskrift.

Svara MÅ være valid JSON med nøyaktig dette formatet (ingen annen tekst):
{"answer":"Din korte forklaring og råd her i flytende tekst.","recipe":null}
ELLER hvis det er en oppskrift:
{"answer":"Din korte forklaring.","recipe":{"name":"Navn på rett (f.eks. Kylling og ris)","steps":["Steg 1: Kok 100g ris.","Steg 2: Stek 150g kylling.","Steg 3: ..."],"calories":350,"protein":12,"fat":8}}

"recipe" skal kun være satt (ikke null) når brukeren ber om hvordan lage noe. "steps" skal være en liste med korte steg på norsk. VIKTIG: I oppskriften må alle ingredienser oppgis med mengde i gram (f.eks. 150g kylling, 100g ris, 50g løk) slik at brukeren kan logge næring. Skriv mengdene direkte i stegene (f.eks. «Kok 100g ris» eller «Bland 40g havregryn med 200ml melk»). Beregn "calories", "protein" og "fat" for én porsjon ut fra de eksakte grammengdene du skrev i stegene (f.eks. 150g kylling + 100g ris = summer kcal og protein for akkurat disse mengdene). Hold "answer" under 100 ord.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Du er en norsk mat-coach. Svar alltid med nøyaktig ett JSON-objekt. Ingen tekst utenom JSON. Feltene er "answer" (string) og "recipe" (null eller objekt med "name", "steps", "calories", "protein" og "fat"). I oppskrifter: oppgi alltid ingrediensmengder i gram i stegene. Beregn calories, protein og fat ut fra disse grammengdene (én porsjon = summen av alle ingrediensene i oppskriften). Ikke gi steps et tall før steget.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { advice: 'Kunne ikke generere svar. Prøv igjen.' };
    }
    try {
      const parsed = JSON.parse(raw) as {
        answer?: string;
        recipe?: { name?: string; steps?: string[]; calories?: number; protein?: number; fat?: number } | null;
      };
      const advice = typeof parsed.answer === 'string' ? parsed.answer : 'Ingen forklaring.';
      const r = parsed.recipe;
      const recipe =
        r && typeof r.name === 'string' && Array.isArray(r.steps) && r.steps.length > 0
          ? {
              name: r.name,
              steps: r.steps.filter((s): s is string => typeof s === 'string'),
              calories: typeof r.calories === 'number' && r.calories >= 0 && r.calories <= 3000 ? Math.round(r.calories) : undefined,
              protein: typeof r.protein === 'number' && r.protein >= 0 && r.protein <= 200 ? Math.round(r.protein) : undefined,
              fat: typeof r.fat === 'number' && r.fat >= 0 && r.fat <= 200 ? Math.round(r.fat) : undefined,
            }
          : undefined;
      return { advice, recipe: recipe ?? undefined };
    } catch {
      return { advice: raw || 'Kunne ikke lese svar.' };
    }
  }

  const prompt = `Du er en vennlig AI mat-coach som hjelper brukeren med å nå målet sitt: ${goalLabel}.${profileLine}

${contextBlock}

Gi 2–4 korte, konkrete råd på norsk. Ta gjerne hensyn til brukerens høyde/vekt/mål hvis oppgitt. Når du nevner mat eller måltider, oppgi gjerne mengder i gram (f.eks. 150g kylling, 100g ris) slik at brukeren kan logge. Vær positiv og oppmuntrende. Ikke bruk bullet points – skriv som en kort melding. Hold det under 150 ord.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Du er en norsk mat-coach. Svar alltid på norsk. Hold svarene korte, vennlige og konkrete. Ikke bruk lister med punktum – skriv i flytende setninger.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 300,
    temperature: 0.6,
  });

  const text = response.choices[0]?.message?.content?.trim();
  return { advice: text || 'Ikke nok data å vurdere ennå. Logg mat for å få personlige råd.' };
}

export interface DailyTargetsRequest {
  goals: {
    goalType: string;
    heightCm?: number;
    weightKg?: number;
    age?: number;
    gender?: string;
    targetWeightKg?: number;
  };
}

export interface DailyTargetsResult {
  dailyCalories: number;
  dailyProtein: number;
  dailyFat: number;
}

/** Get AI-recommended daily calorie and protein targets from user profile. */
export async function getDailyTargets(req: DailyTargetsRequest): Promise<DailyTargetsResult> {
  const g = req.goals ?? {};
  const goalLabel = GOAL_LABELS[g.goalType] ?? 'spise sunt';
  const profileParts: string[] = [];
  if (g.heightCm) profileParts.push(`Høyde: ${g.heightCm} cm`);
  if (g.weightKg) profileParts.push(`Vekt: ${g.weightKg} kg`);
  if (g.targetWeightKg) profileParts.push(`Målvekt: ${g.targetWeightKg} kg`);
  if (g.age) profileParts.push(`Alder: ${g.age} år`);
  if (g.gender) profileParts.push(`Kjønn: ${g.gender === 'male' ? 'mann' : g.gender === 'female' ? 'kvinne' : 'annet'}`);
  const profileLine = profileParts.length > 0 ? profileParts.join(', ') : 'Ikke oppgitt';

  const prompt = `Du er en norsk mat-coach. Brukerens mål: ${goalLabel}.
Brukerprofil: ${profileLine}.

Gi anbefalt daglig inntak som passer for dette målet og profilen. Svar BARE med valid JSON i dette formatet (ingen annen tekst):
{"dailyCalories": 2000, "dailyProtein": 120, "dailyFat": 65}

dailyCalories = anbefalt kcal per dag (heltall). dailyProtein = anbefalt gram protein per dag (heltall). dailyFat = anbefalt gram fett per dag (heltall). Vær realistisk (typisk 1500-2500 kcal, 60-150 g protein, 50-80 g fett avhengig av kjønn, vekt og mål).`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Du svarer kun med ett JSON-objekt med feltene dailyCalories (tall), dailyProtein (tall) og dailyFat (tall). Ingen annen tekst.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 100,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    return { dailyCalories: 2000, dailyProtein: 100, dailyFat: 65 };
  }
  try {
    const parsed = JSON.parse(raw) as { dailyCalories?: number; dailyProtein?: number; dailyFat?: number };
    const cal = typeof parsed.dailyCalories === 'number' ? Math.round(Math.max(1200, Math.min(4000, parsed.dailyCalories))) : 2000;
    const prot = typeof parsed.dailyProtein === 'number' ? Math.round(Math.max(50, Math.min(250, parsed.dailyProtein))) : 100;
    const fat = typeof parsed.dailyFat === 'number' ? Math.round(Math.max(30, Math.min(150, parsed.dailyFat))) : 65;
    return { dailyCalories: cal, dailyProtein: prot, dailyFat: fat };
  } catch {
    return { dailyCalories: 2000, dailyProtein: 100, dailyFat: 65 };
  }
}
