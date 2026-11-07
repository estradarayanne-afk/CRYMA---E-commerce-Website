import 'package:flutter/material.dart';
import '../utils/colors.dart';

/// Security Settings — shows account security information.
/// Toggle controls for 2FA/biometric are removed because the backend has no
/// endpoint for these features. Only change-password is connected.
class SecuritySettingsScreen extends StatelessWidget {
  const SecuritySettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Security Settings'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Info banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.softRose,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined, color: AppColors.primary, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Keep your account safe',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Use a strong, unique password and never share it with anyone.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontFamily: 'Poppins',
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Change password
          Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.lightGray),
            ),
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              leading: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F3F2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.key_outlined,
                    size: 20, color: AppColors.primary),
              ),
              title: const Text(
                'Change Password',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkGray,
                  fontFamily: 'Poppins',
                ),
              ),
              subtitle: const Text(
                'Update your account password',
                style: TextStyle(
                    fontSize: 12, color: AppColors.gray, fontFamily: 'Poppins'),
              ),
              trailing:
                  const Icon(Icons.chevron_right, color: AppColors.gray, size: 18),
              onTap: () => Navigator.pushNamed(context, '/change_password'),
            ),
          ),
        ],
      ),
    );
  }
}
