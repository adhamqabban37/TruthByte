import type { Product } from './types';

export const mockProducts: Record<string, Product> = {
  '012345678905': {
    barcode: '012345678905',
    name: 'Cheesy Potato Chips',
    brand: 'SnackCo',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'potato chips',
    ingredients:
      'Potatoes, Vegetable Oil (Canola, Corn, Soybean, and/or Sunflower Oil), Maltodextrin (Made from Corn), Salt, Whey, Natural Flavors, Cheddar Cheese (Milk, Cheese Cultures, Salt, Enzymes), Onion Powder, Monosodium Glutamate, Dextrose, Spices, Buttermilk, Paprika Extracts, Hydrolyzed Corn Protein, Disodium Inosinate, Disodium Guanylate, Annatto Extracts, and Caramel Color.',
  },
  '987654321098': {
    barcode: '987654321098',
    name: 'Organic Apple Juice',
    brand: 'PureNature',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'apple juice',
    ingredients:
      'Organic Apple Juice from Concentrate (Water, Organic Apple Juice Concentrate), Ascorbic Acid (Vitamin C).',
  },
  '112233445566': {
    barcode: '112233445566',
    name: 'Frosted Sugar Flakes',
    brand: 'Breakfast Inc.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'cereal box',
    ingredients:
      'Milled Corn, Sugar, Malt Flavor, Contains 2% or less of Salt. Vitamins and Minerals: Iron (ferric phosphate), Vitamin C (ascorbic acid), Vitamin E Acetate, Niacinamide, Vitamin A Palmitate, Vitamin B6 (pyridoxine hydrochloride), Vitamin B2 (riboflavin), Vitamin B1 (thiamin hydrochloride), Folic Acid, Vitamin B12, Vitamin D3.',
  },
};

export const getProductByBarcode = (barcode: string): Product | undefined => {
  return mockProducts[barcode] || Object.values(mockProducts)[0];
};

export const trendingProducts: Product[] = [
  mockProducts['012345678905'],
  mockProducts['987654321098'],
  mockProducts['112233445566'],
];
