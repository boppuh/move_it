import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before importing the module under test
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockNot = vi.fn();

function buildSupabaseMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSingle,
  };

  return {
    rpc: mockRpc,
    from: vi.fn().mockReturnValue(chain),
  };
}

describe('findSimilarProductsById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when product is not found', async () => {
    const mockClient = buildSupabaseMock();
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Row not found' } });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    await expect(
      findSimilarProductsById('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow('Product not found');
  });

  it('throws when product has no embedding', async () => {
    const mockClient = buildSupabaseMock();
    mockSingle.mockResolvedValue({
      data: { embedding: null, category: 'bed' },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    await expect(
      findSimilarProductsById('00000000-0000-0000-0000-000000000001')
    ).rejects.toThrow('has no embedding');
  });

  it('calls rpc with correct category and excludeId', async () => {
    const testEmbedding = new Array(1536).fill(0.1);
    const mockClient = buildSupabaseMock();

    // First call: get product embedding
    mockSingle.mockResolvedValue({
      data: { embedding: testEmbedding, category: 'bed' },
      error: null,
    });

    // Second call: rpc similarity search
    mockRpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    const productId = '00000000-0000-0000-0000-000000000002';
    await findSimilarProductsById(productId, { limit: 5 });

    expect(mockRpc).toHaveBeenCalledWith('find_similar_products', expect.objectContaining({
      query_category: 'bed',
      exclude_id: productId,
      result_limit: 5,
      similarity_threshold: 0.75,
    }));
  });

  it('passes price filters to rpc', async () => {
    const testEmbedding = new Array(1536).fill(0.2);
    const mockClient = buildSupabaseMock();

    mockSingle.mockResolvedValue({
      data: { embedding: testEmbedding, category: 'sofa' },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    await findSimilarProductsById('00000000-0000-0000-0000-000000000003', {
      priceMin: 300,
      priceMax: 800,
    });

    expect(mockRpc).toHaveBeenCalledWith('find_similar_products', expect.objectContaining({
      price_min: 300,
      price_max: 800,
      query_category: 'sofa',
    }));
  });

  it('passes null for optional filters when not provided', async () => {
    const testEmbedding = new Array(1536).fill(0.3);
    const mockClient = buildSupabaseMock();

    mockSingle.mockResolvedValue({
      data: { embedding: testEmbedding, category: 'nightstand' },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    await findSimilarProductsById('00000000-0000-0000-0000-000000000004');

    expect(mockRpc).toHaveBeenCalledWith('find_similar_products', expect.objectContaining({
      price_min: null,
      price_max: null,
    }));
  });

  it('returns products from rpc response', async () => {
    const testEmbedding = new Array(1536).fill(0.4);
    const mockProducts = [
      { id: 'abc', name: 'Test Bed', brand: 'TestBrand', price: 499, sale_price: null, url: null, image_url: null, retailer_id: 'r1', similarity_score: 0.92 },
    ];

    const mockClient = buildSupabaseMock();
    mockSingle.mockResolvedValue({
      data: { embedding: testEmbedding, category: 'bed' },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: mockProducts, error: null });
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    const { findSimilarProductsById } = await import('../similarity');

    const results = await findSimilarProductsById('00000000-0000-0000-0000-000000000005');
    expect(results).toEqual(mockProducts);
  });
});
