import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';
import 'logout_confirmation_dialog.dart';

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
      // Always attempt to load the profile image — the URL check was preventing
      // it from loading even when the server had an image stored.
      try {
        final bytes = await ApiService.instance.getProfileImageBytes();
        if (mounted) setState(() => _profileImage = bytes);
      } catch (_) {
        if (mounted) setState(() => _profileImage = null);
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

  String get _initials {
    final first = _user?['first_name']?.toString() ?? '';
    final last = _user?['last_name']?.toString() ?? '';
    final i1 = first.isNotEmpty ? first[0] : '';
    final i2 = last.isNotEmpty ? last[0] : '';
    return '$i1$i2'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            // ── HEADER ──────────────────────────────────────────────
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Account',
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.wine,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip:
                        _user == null ? 'Sign in to view messages' : 'Messages',
                    onPressed: () => Navigator.pushNamed(context, '/chat_list'),
                    icon: Icon(
                      _user == null
                          ? Icons.login_rounded
                          : Icons.forum_outlined,
                      color: AppColors.darkGray,
                    ),
                  ),
                ],
              ),
            ),

            // ── BODY ────────────────────────────────────────────────
            Expanded(
              child: _user == null
                  ? _buildGuest(context)
                  : SingleChildScrollView(
                      child: Column(
                        children: [
                          _buildProfileHeader(),
                          const SizedBox(height: 16),
                          _buildSection('MY SHOPPING', const [
                            _MenuItem(Icons.star_outline, 'My Reviews',
                                '/my_reviews'),
                            _MenuItem(Icons.local_offer_outlined, 'Vouchers',
                                '/vouchers'),
                            _MenuItem(
                                Icons.favorite_border, 'Wishlist', '/wishlist'),
                          ]),
                          _buildSection('ACCOUNT SETTINGS', const [
                            _MenuItem(Icons.person_outline, 'Edit Profile',
                                '/edit_profile'),
                            _MenuItem(Icons.location_on_outlined,
                                'Address Book', '/address_book'),
                            _MenuItem(Icons.wallet_outlined, 'Payment Methods',
                                '/payment_methods'),
                            _MenuItem(Icons.shield_outlined,
                                'Security Settings', '/security_settings'),
                          ]),
                          _buildSection('HELP & SUPPORT', const [
                            _MenuItem(Icons.support_agent, 'Customer Support',
                                '/support'),
                            _MenuItem(Icons.help_outline, 'Help Center',
                                '/help_center'),
                            _MenuItem(Icons.description_outlined,
                                'Terms & Conditions', '/terms'),
                            _MenuItem(Icons.privacy_tip_outlined,
                                'Privacy Policy', '/privacy'),
                          ]),
                          // Logout
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            child: SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: OutlinedButton(
                                onPressed: () => showDialog<void>(
                                  context: context,
                                  builder: (_) =>
                                      const LogoutConfirmationDialog(),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.danger,
                                  side:
                                      const BorderSide(color: AppColors.danger),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.logout_outlined, size: 19),
                                    SizedBox(width: 8),
                                    Text(
                                      'Logout',
                                      style: TextStyle(
                                        fontFamily: 'Poppins',
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
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
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 3,
        onDestinationSelected: (index) =>
            BuyerBottomNavigationBar.navigateToTab(context, index, 3),
      ),
    );
  }

  // ── PROFILE HEADER ──────────────────────────────────────────────────────
  Widget _buildProfileHeader() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primaryDark, AppColors.primary],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppColors.wine.withValues(alpha: .12),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.softRose,
              border: Border.all(color: AppColors.primaryDark, width: 2.5),
            ),
            child: _profileImage == null
                ? Center(
                    child: Text(
                      _initials.isEmpty ? '?' : _initials,
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  )
                : ClipOval(
                    child: Image.memory(_profileImage!,
                        fit: BoxFit.cover, width: 88, height: 88),
                  ),
          ),
          const SizedBox(height: 14),
          Text(
            _displayName,
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            _displayEmail,
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 13,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () async {
              await Navigator.pushNamed(context, '/edit_profile');
              _loadUser();
            },
            icon: const Icon(Icons.edit_outlined, size: 17),
            label: const Text(
              'Edit Profile',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primaryDark,
              backgroundColor: Colors.white,
              side: const BorderSide(color: Colors.white),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              minimumSize: const Size(0, 40),
              padding: const EdgeInsets.symmetric(horizontal: 20),
            ),
          ),
        ],
      ),
    );
  }

  // ── GUEST STATE ──────────────────────────────────────────────────────────
  Widget _buildGuest(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(
                color: AppColors.softRose,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_outline_rounded,
                  color: AppColors.primary, size: 46),
            ),
            const SizedBox(height: 22),
            const Text(
              'Your CRYMA account',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.wine,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sign in to manage your profile, track orders, and keep your shopping details in one place.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 14,
                height: 1.5,
                color: AppColors.gray,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () => Navigator.pushNamed(context, '/login'),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Sign in',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, '/register_personal'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Create account',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── MENU SECTION ────────────────────────────────────────────────────────
  Widget _buildSection(String title, List<_MenuItem> items) {
    final iconBackground = switch (title) {
      'MY SHOPPING' => AppColors.softRose,
      'ACCOUNT SETTINGS' => AppColors.surfaceNeutral,
      _ => const Color(0xFFF0F1F2),
    };
    final iconForeground =
        title == 'HELP & SUPPORT' ? AppColors.gray : AppColors.primaryDark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, bottom: 8),
            child: Text(
              title,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textSubtle,
                letterSpacing: 0.8,
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderNeutral),
            ),
            child: Column(
              children: [
                for (int i = 0; i < items.length; i++)
                  _buildMenuRow(
                    items[i],
                    i == items.length - 1,
                    iconBackground,
                    iconForeground,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuRow(
    _MenuItem item,
    bool isLast,
    Color iconBackground,
    Color iconForeground,
  ) {
    return InkWell(
      onTap: () => Navigator.pushNamed(context, item.route),
      borderRadius: isLast
          ? const BorderRadius.only(
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            )
          : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          border: isLast
              ? null
              : const Border(
                  bottom: BorderSide(color: AppColors.borderNeutral),
                ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconBackground,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(item.icon, size: 19, color: iconForeground),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.label,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkGray,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: AppColors.textSubtle),
          ],
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final String route;
  const _MenuItem(this.icon, this.label, this.route);
}
