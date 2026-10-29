import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// ADDRESS MODEL
// ============================================================
class Address {
  final String id;
  final String label;
  final IconData icon;
  final String name;
  final String phone;
  final String address;
  final bool isDefault;

  const Address({
    required this.id,
    required this.label,
    required this.icon,
    required this.name,
    required this.phone,
    required this.address,
    this.isDefault = false,
  });
}

// ============================================================
// ADDRESS BOOK SCREEN
// ============================================================
class AddressBookScreen extends StatelessWidget {
  AddressBookScreen({super.key});

  final List<Address> _addresses = const [
    Address(
      id: '1',
      label: 'Home',
      icon: Icons.home_outlined,
      name: 'Juan Dela Cruz',
      phone: '0917 123 4567',
      address:
          '123 Sampaguita St., Brgy. Maliwanag,\nSan Juan, Metro Manila 1500',
      isDefault: true,
    ),
    Address(
      id: '2',
      label: 'Work',
      icon: Icons.work_outlined,
      name: 'Juan Dela Cruz',
      phone: '0917 123 4567',
      address: '456 Rosal Ave., Brgy. Kabayanan,\nSan Juan, Metro Manila 1500',
      isDefault: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER - back arrow + "Address Book"
            // ============================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 24, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Address Book',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
            const SizedBox(height: 4),

            // ============================================================
            // ADDRESS CARDS (scrollable)
            // ============================================================
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: _addresses
                      .map((address) => _buildAddressCard(address))
                      .toList(),
                ),
              ),
            ),

            // ============================================================
            // FIXED "ADD NEW ADDRESS" BUTTON - HINDI PUTOL
            // ============================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFFF5F6F8),
                border: Border(
                  top: BorderSide(color: Color(0xFFE8E8E8), width: 1),
                ),
              ),
              child: GestureDetector(
                onTap: () {
                  Navigator.pushNamed(context, '/add_address');
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppColors.primary,
                      width: 2,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.add_circle_outline,
                          size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text(
                        'Add New Address',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
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
  // ADDRESS CARD - may edit at delete icons sa kanan
  // ============================================================
  Widget _buildAddressCard(Address address) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: address.isDefault ? AppColors.primary : AppColors.lightGray,
          width: address.isDefault ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ============================================================
          // HEADER: Icon + Label + Default Badge + Edit/Delete Icons
          // ============================================================
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: AppColors.lightGray,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      address.icon,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    address.label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  if (address.isDefault) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.lightGray,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'Default',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              // ✅ EDIT AT DELETE ICONS SA KANAN
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_outlined,
                        size: 18, color: AppColors.primary),
                    onPressed: () {},
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(Icons.delete_outline,
                        size: 18, color: AppColors.danger),
                    onPressed: () {},
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // ============================================================
          // NAME
          // ============================================================
          Text(
            address.name,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 2),

          // ============================================================
          // PHONE NUMBER
          // ============================================================
          Text(
            address.phone,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.gray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 2),

          // ============================================================
          // ADDRESS
          // ============================================================
          Text(
            address.address,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.gray,
              fontFamily: 'Poppins',
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
