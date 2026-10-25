import axios from 'axios';
import { logger } from '../utils/logger';

export interface PsgcEntry {
  code: string;
  name: string;
}

const PSGC_API_BASE = 'https://psgc.gitlab.io/api';

// In-memory cache with TTL (7 days)
const cache: Record<string, { data: PsgcEntry[]; timestamp: number }> = {};
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export class AddressService {
  /**
   * Get all regions (cached)
   */
  async getRegions(): Promise<PsgcEntry[]> {
    return this.fetchAndCache('regions', '/regions/');
  }

  /**
   * Get provinces for a region (cached)
   */
  async getProvinces(regionCode: string): Promise<PsgcEntry[]> {
    const cacheKey = `provinces_${regionCode}`;
    return this.fetchAndCache(cacheKey, `/regions/${regionCode}/provinces/`);
  }

  /**
   * Get municipalities for a province (cached)
   */
  async getMunicipalities(provinceCode: string): Promise<PsgcEntry[]> {
    const cacheKey = `municipalities_${provinceCode}`;
    return this.fetchAndCache(
      cacheKey,
      `/provinces/${provinceCode}/cities-municipalities/`
    );
  }

  /**
   * Get barangays for a municipality (cached)
   */
  async getBarangays(municipalityCode: string): Promise<PsgcEntry[]> {
    const cacheKey = `barangays_${municipalityCode}`;
    return this.fetchAndCache(
      cacheKey,
      `/cities-municipalities/${municipalityCode}/barangays/`
    );
  }

  /**
   * Fetch from PSGC API with caching
   */
  private async fetchAndCache(cacheKey: string, path: string): Promise<PsgcEntry[]> {
    // Check cache
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    try {
      logger.debug(`Fetching ${cacheKey} from PSGC API`);
      const response = await axios.get(`${PSGC_API_BASE}${path}`, {
        timeout: 15000,
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid PSGC response format');
      }

      // Parse entries
      const entries: PsgcEntry[] = response.data
        .map((item: any) => ({
          code: item.code || item.psgcCode || '',
          name: item.name || '',
        }))
        .filter((item: PsgcEntry) => item.code && item.name)
        .sort((a: PsgcEntry, b: PsgcEntry) => a.name.localeCompare(b.name));

      // Cache result
      cache[cacheKey] = {
        data: entries,
        timestamp: Date.now(),
      };

      logger.debug(`Cached ${entries.length} entries for ${cacheKey}`);
      return entries;
    } catch (error: any) {
      logger.error(`Error fetching ${cacheKey} from PSGC API`, error);
      throw new Error(`Failed to fetch ${cacheKey}. Please try again.`);
    }
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    Object.keys(cache).forEach((key) => delete cache[key]);
    logger.debug('Address cache cleared');
  }
}

export const addressService = new AddressService();
