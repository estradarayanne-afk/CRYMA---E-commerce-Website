import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';
import '../widgets/buyer_bottom_navigation_bar.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Map<String, dynamic>? _user;
  Uint8List? _profileImage;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('cryma_api_user');
    if (raw != null && mounted) {
      setState(() {
        try {
          _user = jsonDecode(raw) as Map<String, dynamic>;
        } catch (_) {}
      });
      if (_user?['profile_image_url'] != null) {
        try {
          final bytes = await ApiService.instance.getProfileImageBytes();
          if (mounted) setState(() => _profileImage = bytes);
        } catch (_) {}
      } else if (mounted) {
        setState(() => _profileImage = null);
      }
    }
  }

  String get _displayName {
    if (_user == null) return 'Guest';
    final first = _user!['first_name']?.toString() ?? '';
    final last = _user!['last_name']?.toString() ?? '';
    return '$first $last'.trim().isEmpty ? 'User' : '$first $last'.trim();
  }

  String get _displayEmail => _user?['email']?.toString() ?? '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Account',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  IconButton(
                    tooltip: _user == null
                        ? 'Sign in to view messages'
                        : 'Messages',
                    onPressed: () => Navigator.pushNamed(
                      context,
                      _user == null ? '/login' : '/chat_list',
                    ),
                    icon: Icon(
                      _user == null
                          ? Icons.login_rounded
                          : Icons.chat_bubble_outline,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _user == null
                  ? _buildGuestAccount(context)
                  : SingleChildScrollView(
                      child: Column(
                        children: [
                          Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border:
                                  Border.all(color: const Color(0xFFE8E8E8)),
                            ),
                            padding: const EdgeInsets.only(top: 24, bottom: 24),
                            child: Column(
                              children: [
                                Container(
                                  width: 100,
                                  height: 100,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.lightGray,
                                  ),
                                  child: _profileImage == null
                                      ? const Icon(Icons.person,
                                          size: 56, color: AppColors.gray)
                                      : ClipOval(
                                          child: Image.memory(_profileImage!,
                                              fit: BoxFit.cover,
                                              width: 100,
                                              height: 100)),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _displayName,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _displayEmail,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.gray,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                                const SizedBox(height: 16),
                                GestureDetector(
                                  onTap: () async {
                                    await Navigator.pushNamed(
                                        context, '/edit_profile');
                                    _loadUser();
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 28, vertical: 10),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(24),
                                      border: Border.all(
                                          color: AppColors.primary, width: 1.5),
                                    ),
                                    child: const Text(
                                      'Edit Profile',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildMenuSection(context, 'MY ACCOUNT', const [
                            _MenuItem(
                                icon: Icons.person_outline,
                                label: 'Personal Information',
                                route: '/edit_profile'),
                            _MenuItem(
                                icon: Icons.location_on_outlined,
                                label: 'Address Book',
                                route: '/address_book'),
                            _MenuItem(
                                icon: Icons.wallet_outlined,
                                label: 'Payment Methods',
                                route: '/payment_methods'),
                          ]),
                          _buildMenuSection(context, 'MY SHOPPING', const [
                            _MenuItem(
                                icon: Icons.description_outlined,
                                label: 'My Orders',
                                route: '/my_orders'),
                            _MenuItem(
                                icon: Icons.star_outline,
                                label: 'My Reviews',
                                route: '/my_reviews'),
                            _MenuItem(
                                icon: Icons.local_offer_outlined,
                                label: 'Vouchers',
                                route: '/vouchers'),
                            _MenuItem(
                                icon: Icons.favorite_border,
                                label: 'Wishlist',
                                route: '/wishlist'),
                          ]),
                          _buildMenuSection(context, 'SUPPORT', const [
                            _MenuItem(
                                icon: Icons.chat_bubble_outline,
                                label: 'Customer Support',
                                route: '/support'),
                            _MenuItem(
                                icon: Icons.help_outline,
                                label: 'Help Center',
                                route: '/help_center'),
                            _MenuItem(
                                icon: Icons.description_outlined,
                                label: 'Terms & Conditions',
                                route: '/terms'),
                            _MenuItem(
                                icon: Icons.shield_outlined,
                                label: 'Privacy Policy',
                                route: '/privacy'),
                          ]),
                          _buildMenuSection(context, 'SECURITY', const [
                            _MenuItem(
                                icon: Icons.key_outlined,
                                label: 'Change Password',
                                route: '/change_password'),
                            _MenuItem(
                                icon: Icons.shield_outlined,
                                label: 'Security Settings',
                                route: '/security_settings'),
                          ]),
                          GestureDetector(
                            onTap: () => Navigator.pushNamed(
                                context, '/logout_confirmation'),
                            child: Container(
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF5F5),
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: const Color(0xFFFCD5D5)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.logout_outlined,
                                      size: 20, color: AppColors.danger),
                                  SizedBox(width: 8),
                                  Text('Logout',
                                      style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.danger,
                                          fontFamily: 'Poppins')),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 4,
        onDestinationSelected: (index) =>
            BuyerBottomNavigationBar.navigateToTab(context, index, 4),
      ),
    );
  }

  Widget _buildGuestAccount(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: const BoxDecoration(
                color: AppColors.softRose,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person_outline_rounded,
                color: AppColors.primary,
                size: 52,
              ),
            ),
            const SizedBox(height: 22),
            const Text(
              'Your CRYMA account',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sign in to manage your profile, track orders, and keep your shopping details in one place.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: AppColors.gray,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pushNamed(context, '/login'),
                child: const Text('Sign in'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, '/register_personal'),
                child: const Text('Create account'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection(
      BuildContext context, String title, List<_MenuItem> items) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, bottom: 8),
            child: Text(title,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gray,
                    fontFamily: 'Poppins')),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 2,
                    offset: const Offset(0, 1))
              ],
            ),
            child: Column(
              children: items.map((item) {
                final isLast = item == items.last;
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, item.route),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      border: isLast
                          ? null
                          : const Border(
                              bottom: BorderSide(color: Color(0xFFF0F0F0))),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                              color: const Color(0xFFE8F3F2),
                              borderRadius: BorderRadius.circular(10)),
                          child: Icon(item.icon,
                              size: 20, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text(item.label,
                                style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.darkGray,
                                    fontFamily: 'Poppins'))),
                        const Icon(Icons.chevron_right,
                            size: 18, color: AppColors.gray),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final String route;
  const _MenuItem(
      {required this.icon, required this.label, required this.route});
}
