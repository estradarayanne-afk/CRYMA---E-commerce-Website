import { Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { logger } from '../utils/logger';

export class AddressController {
  /**
   * Get all regions
   * GET /api/address/regions
   */
  static async getRegions(req: Request, res: Response): Promise<void> {
    logger.debug('Fetching regions');

    const regions = await addressService.getRegions();

    res.json({
      success: true,
      data: { regions },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get provinces for a region
   * GET /api/address/provinces/:regionCode
   */
  static async getProvinces(req: Request, res: Response): Promise<void> {
    const { regionCode } = req.params;

    logger.debug(`Fetching provinces for region: ${regionCode}`);

    const provinces = await addressService.getProvinces(regionCode);

    res.json({
      success: true,
      data: { provinces },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get municipalities for a province
   * GET /api/address/municipalities/:provinceCode
   */
  static async getMunicipalities(req: Request, res: Response): Promise<void> {
    const { provinceCode } = req.params;

    logger.debug(`Fetching municipalities for province: ${provinceCode}`);

    const municipalities = await addressService.getMunicipalities(provinceCode);

    res.json({
      success: true,
      data: { municipalities },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get barangays for a municipality
   * GET /api/address/barangays/:municipalityCode
   */
  static async getBarangays(req: Request, res: Response): Promise<void> {
    const { municipalityCode } = req.params;

    logger.debug(`Fetching barangays for municipality: ${municipalityCode}`);

    const barangays = await addressService.getBarangays(municipalityCode);

    res.json({
      success: true,
      data: { barangays },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }
}
