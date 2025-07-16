import type { Product } from './types';

/**
 * Fetches product data from the Open Food Facts API.
 * @param barcode The product barcode.
 * @returns A promise that resolves to a Product object or null if not found.
 */
export async function getProductFromApi(
  barcode: string
): Promise<Product | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}`
    );
    if (!response.ok) {
      console.error('Failed to fetch product data:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      console.log(`Product with barcode ${barcode} not found.`);
      return null;
    }

    const productData = data.product;
    const productName = productData.product_name || 'Unknown Product';

    const product: Product = {
      barcode: barcode,
      name: productName,
      brand: productData.brands || 'Unknown Brand',
      imageUrl: productData.image_front_url || `https://placehold.co/600x400.png`,
      ingredients: productData.ingredients_text,
      nutriscore: productData.nutriscore_grade,
      dataAiHint: productData.product_name ? productName.split(' ').slice(0, 2).join(' ') : 'food product',
    };

    return product;
  } catch (error) {
    console.error('Error fetching product from API:', error);
    return null;
  }
}
