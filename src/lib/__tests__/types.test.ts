import { describe, it, expect } from 'vitest';
import {
  ProductSchema,
  RetailerSchema,
  ComparisonSchema,
  AffiliateClickSchema,
  SimilarProductsQuerySchema,
  ValueAnalysisSchema,
} from '../types';

describe('ProductSchema', () => {
  it('validates a complete valid product', () => {
    const result = ProductSchema.safeParse({
      name: 'Test Sofa',
      category: 'sofa',
      price: 999.99,
      brand: 'TestBrand',
      materials: ['solid wood', 'velvet'],
      style_tags: ['mid-century'],
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a product missing required name', () => {
    const result = ProductSchema.safeParse({
      category: 'sofa',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a product missing required category', () => {
    const result = ProductSchema.safeParse({
      name: 'Test Sofa',
    });
    expect(result.success).toBe(false);
  });

  it('defaults currency to USD', () => {
    const result = ProductSchema.safeParse({ name: 'Bed', category: 'bed' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('USD');
  });

  it('defaults is_active to true', () => {
    const result = ProductSchema.safeParse({ name: 'Bed', category: 'bed' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_active).toBe(true);
  });

  it('defaults materials and style_tags to empty arrays', () => {
    const result = ProductSchema.safeParse({ name: 'Bed', category: 'bed' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.materials).toEqual([]);
      expect(result.data.style_tags).toEqual([]);
    }
  });

  it('rejects embedding with wrong dimension count', () => {
    const result = ProductSchema.safeParse({
      name: 'Bed',
      category: 'bed',
      embedding: new Array(512).fill(0.1), // wrong dimensions
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid embedding with 1536 dimensions', () => {
    const result = ProductSchema.safeParse({
      name: 'Bed',
      category: 'bed',
      embedding: new Array(1536).fill(0.1),
    });
    expect(result.success).toBe(true);
  });
});

describe('RetailerSchema', () => {
  it('validates a complete valid retailer', () => {
    const result = RetailerSchema.safeParse({
      name: 'Wayfair',
      slug: 'wayfair',
      affiliate_network: 'cj',
      commission_rate: 0.07,
      cookie_days: 7,
      feed_format: 'csv',
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid affiliate_network', () => {
    const result = RetailerSchema.safeParse({
      name: 'TestRetailer',
      slug: 'test',
      affiliate_network: 'unknown_network',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null affiliate_network', () => {
    const result = RetailerSchema.safeParse({
      name: 'TestRetailer',
      slug: 'test',
      affiliate_network: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('ComparisonSchema', () => {
  it('validates a complete comparison', () => {
    const result = ComparisonSchema.safeParse({
      slug: 'article-sven-sofa-vs-alternatives',
      value_score: 87,
      alternatives: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects value_score outside 1-100 range', () => {
    const tooHigh = ComparisonSchema.safeParse({ slug: 'test', value_score: 150 });
    expect(tooHigh.success).toBe(false);

    const tooLow = ComparisonSchema.safeParse({ slug: 'test', value_score: 0 });
    expect(tooLow.success).toBe(false);
  });

  it('defaults view_count and share_count to 0', () => {
    const result = ComparisonSchema.safeParse({ slug: 'test-slug' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.view_count).toBe(0);
      expect(result.data.share_count).toBe(0);
    }
  });
});

describe('SimilarProductsQuerySchema', () => {
  it('validates required product_id', () => {
    const result = SimilarProductsQuerySchema.safeParse({
      product_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = SimilarProductsQuerySchema.safeParse({
      product_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('defaults limit to 5', () => {
    const result = SimilarProductsQuerySchema.safeParse({
      product_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(5);
  });

  it('coerces string price_min to number', () => {
    const result = SimilarProductsQuerySchema.safeParse({
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      price_min: '300',
      price_max: '800',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price_min).toBe(300);
      expect(result.data.price_max).toBe(800);
    }
  });

  it('enforces limit max of 20', () => {
    const result = SimilarProductsQuerySchema.safeParse({
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '25',
    });
    expect(result.success).toBe(false);
  });
});

describe('ValueAnalysisSchema', () => {
  it('validates a complete value analysis', () => {
    const result = ValueAnalysisSchema.safeParse({
      value_score: 85,
      verdict: 'Excellent value for the price',
      strengths: ['Solid wood construction', 'Good reviews'],
      weaknesses: ['Limited color options'],
      comparison_notes: { 'product-id-1': 'Similar style at lower price' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects value_score above 100', () => {
    const result = ValueAnalysisSchema.safeParse({
      value_score: 101,
      verdict: 'test',
      strengths: [],
      weaknesses: [],
      comparison_notes: {},
    });
    expect(result.success).toBe(false);
  });
});
