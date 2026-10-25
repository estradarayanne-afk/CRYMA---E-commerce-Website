import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// VOUCHER MODEL
// ============================================================
class Voucher {
  final String id;
  final String title;
  final String description;
  final String condition;

  const Voucher({
    required this.id,
    required this.title,
    required this.description,
    required this.condition,
  });
}

// ============================================================
// VOUCHER SELECTION SCREEN
// ============================================================
class VoucherSelectionScreen extends StatefulWidget {
  const VoucherSelectionScreen({super.key});

  @override
  State<VoucherSelectionScreen> createState() => _VoucherSelectionScreenState();
}

class _VoucherSelectionScreenState extends State<VoucherSelectionScreen> {
  final TextEditingController _voucherController = TextEditingController();
  String? _selectedVoucherId;

  final List<Voucher> _vouchers = const [
    Voucher(
      id: '1',
      title: 'CRYMA Welcome Promo',
      description: '₱100 off',
      condition: '₱500 min spend · Expires Aug 31, 2026',
    ),
    Voucher(
      id: '2',
      title: 'Free Shipping',
      description: 'Free delivery',
      condition: '₱300 min spend · Expires Sep 15, 2026',
    ),
    Voucher(
      id: '3',
      title: 'Flash Sale 20%',
      description: '20% off',
      condition: '₱1,000 min spend · Expires Aug 24, 2026',
    ),
  ];

  @override
  void initState() {
    super.initState();
    // Select the first voucher by default
    _selectedVoucherId = _vouchers.first.id;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _toggleVoucher(String id) {
    setState(() {
      if (_selectedVoucherId == id) {
        _selectedVoucherId = null;
      } else {
        _selectedVoucherId = id;
      }
    });
  }

  void _applyVoucher() {
    if (_selectedVoucherId != null) {
      final voucher = _vouchers.firstWhere((v) => v.id == _selectedVoucherId);
      _showMessage('Voucher "${voucher.title}" applied!');
      Navigator.pop(context);
    } else {
      _showMessage('Please select a voucher first.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER - back arrow + "Select Voucher"
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 22, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Select Voucher',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                      letterSpacing: 1,
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),

            // ============================================================
            // BODY (scrollable)
            // ============================================================
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ============================================================
                    // VOUCHER CODE INPUT + APPLY BUTTON
                    // ============================================================
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.lightGray),
                            ),
                            child: TextField(
                              controller: _voucherController,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.darkGray,
                                fontFamily: 'Poppins',
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Enter voucher code',
                                hintStyle: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.gray,
                                  fontFamily: 'Poppins',
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton(
                          onPressed: () {
                            if (_voucherController.text.isNotEmpty) {
                              _showMessage(
                                  'Voucher applied: ${_voucherController.text}');
                              _voucherController.clear();
                            } else {
                              _showMessage('Please enter a voucher code');
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          child: const Text(
                            'Apply',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.white,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // ============================================================
                    // AVAILABLE VOUCHERS TITLE
                    // ============================================================
                    const Text(
                      'Available Vouchers',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 10),

                    // ============================================================
                    // VOUCHER CARDS
                    // ============================================================
                    ..._vouchers
                        .map((voucher) => _buildVoucherCard(voucher))
                        .toList(),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // ============================================================
            // BOTTOM FIXED BUTTON - "Use Voucher"
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _applyVoucher,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Use Voucher',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.white,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // VOUCHER CARD
  // ============================================================
  Widget _buildVoucherCard(Voucher voucher) {
    final isSelected = _selectedVoucherId == voucher.id;

    return GestureDetector(
      onTap: () => _toggleVoucher(voucher.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightGray,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          children: [
            // ============================================================
            // LEFT: ICON CONTAINER (light teal)
            // ============================================================
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.lightGray,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.local_offer_outlined,
                size: 22,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),

            // ============================================================
            // MIDDLE: VOUCHER INFO
            // ============================================================
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    voucher.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color:
                          isSelected ? AppColors.primary : AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    voucher.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: isSelected ? AppColors.primary : AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    voucher.condition,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),

            // ============================================================
            // RIGHT: CHECKMARK ICON (kapag selected)
            // ============================================================
            if (isSelected)
              Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  size: 16,
                  color: AppColors.white,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
