import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/address/regions
 * Get all Philippine regions
 */
router.get('/regions', asyncHandler(AddressController.getRegions));

/**
 * GET /api/address/provinces/:regionCode
 * Get provinces for a region
 */
router.get(
  '/provinces/:regionCode',
  asyncHandler(AddressController.getProvinces)
);

/**
 * GET /api/address/municipalities/:provinceCode
 * Get municipalities/cities for a province
 */
router.get(
  '/municipalities/:provinceCode',
  asyncHandler(AddressController.getMunicipalities)
);

/**
 * GET /api/address/barangays/:municipalityCode
 * Get barangays for a municipality
 */
router.get(
  '/barangays/:municipalityCode',
  asyncHandler(AddressController.getBarangays)
);

export default router;
