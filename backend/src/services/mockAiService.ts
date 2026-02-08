import { Product, PriceEvaluation } from '../types/index.js';

export async function evaluatePrice(
  product: Product,
  price: number,
  currency: string,
  barcode: string
): Promise<PriceEvaluation> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock evaluation logic based on price ranges
  let evaluation: 'good' | 'average' | 'expensive';
  let explanation: string;
  
  if (price < 20) {
    evaluation = 'good';
    explanation = `Dette er en god pris for ${product.name}. Basert på lignende produkter i det norske markedet ligger dette i det lavere prissjiktet. Du kan potensielt spare noen kroner andre steder, men dette er ikke dyrt.`;
  } else if (price < 40) {
    evaluation = 'average';
    explanation = `Dette er en gjennomsnittlig pris for ${product.name}. Prisen ligger rundt det du normalt finner i norske dagligvarebutikker. Du kan sannsynligvis finne det litt billigere på tilbud, men dette er en akseptabel pris.`;
  } else {
    evaluation = 'expensive';
    explanation = `Dette virker som en relativt høy pris for ${product.name}. I det norske markedet finner du ofte lignende produkter til en lavere pris. Vurder å sjekke andre butikker eller vente på tilbud.`;
  }

  return {
    evaluation,
    explanation,
    product,
    confidence: 'medium',
    barcode,
    price,
    currency,
  };
}
