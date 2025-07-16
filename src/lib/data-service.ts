import type { Product } from './types';

function toProduct(productData: any, barcode?: string): Product | null {
  if (!productData) return null;
  const productName = productData.product_name || 'Unknown Product';
  return {
    barcode: productData.code || barcode || '',
    name: productName,
    brand: productData.brands || 'Unknown Brand',
    imageUrl: productData.image_front_url || `https://placehold.co/600x400.png`,
    ingredients: productData.ingredients_text,
    nutriscore: productData.nutriscore_grade,
    dataAiHint: productData.product_name ? productName.split(' ').slice(0, 2).join(' ') : 'food product',
  };
}

/**
 * Searches for products from the Open Food Facts API by text.
 * @param query The search query.
 * @returns A promise that resolves to the first found Product or null.
 */
export async function searchProductsFromApi(query: string): Promise<Product | null> {
  try {
    const searchParams = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '1' // We only need the top result for the tool
    });
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${searchParams.toString()}`
    );

    if (!response.ok) {
      console.error('Failed to search for product:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      console.log(`No products found for query: ${query}`);
      return null;
    }
    
    // Return the first product found
    return toProduct(data.products[0]);
  } catch (error) {
    console.error('Error searching for product from API:', error);
    return null;
  }
}

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
    
    return toProduct(data.product, barcode);
  } catch (error) {
    console.error('Error fetching product from API:', error);
    return null;
  }
}
