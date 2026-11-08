import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  XFile? _profileImage;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _middleNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  /// Fetch fresh user data from the API on mount so the profile form always
  /// reflects the current server state, not a potentially stale local cache.
  Future<void> _loadUser() async {
    try {
      final response =
          await ApiService.instance.get('/api/user', authenticated: true);
      final fresh = response['user'] as Map<String, dynamic>?;
      if (fresh != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cryma_api_user', jsonEncode(fresh));
        if (mounted) {
          _firstNameController.text = fresh['first_name']?.toString() ?? '';
          _lastNameController.text = fresh['last_name']?.toString() ?? '';
          _middleNameController.text = fresh['middle_name']?.toString() ?? '';
          _emailController.text = fresh['email']?.toString() ?? '';
          _phoneController.text = fresh['phone']?.toString() ?? '';
          setState(() => _loading = false);
          return;
        }
      }
    } catch (_) {
      // Fall through to the local cache.
    }
    // Local cache fallback — used when the device is offline.
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('cryma_api_user');
    if (raw != null) {
      try {
        final user = jsonDecode(raw) as Map<String, dynamic>;
        _firstNameController.text = user['first_name']?.toString() ?? '';
        _lastNameController.text = user['last_name']?.toString() ?? '';
        _middleNameController.text = user['middle_name']?.toString() ?? '';
        _emailController.text = user['email']?.toString() ?? '';
        _phoneController.text = user['phone']?.toString() ?? '';
      } catch (_) {}
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _handleSave() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      late final Map<String, dynamic> response;
      final profileFields = <String, dynamic>{
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'middle_name': _middleNameController.text.trim(),
        'phone': _phoneController.text.trim(),
      };
      if (_profileImage != null) {
        response = await ApiService.instance.updateProfileImage(
          _profileImage!,
          fields: profileFields
              .map((key, value) => MapEntry(key, value.toString())),
        );
      } else {
        response = await ApiService.instance.patch(
          '/api/account/profile',
          authenticated: true,
          body: profileFields,
        );
      }
      final updatedUser = response['data'] as Map<String, dynamic>?;
      if (updatedUser != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cryma_api_user', jsonEncode(updatedUser));
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
        Navigator.pop(context);
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update profile.')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: AppColors.background,
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              child: Row(
                children: [
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.white,
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(13),
                      ),
                    ),
                    icon: const Icon(Icons.arrow_back_rounded, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Edit Profile',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              color: AppColors.wine,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          Text(
                            'Keep your personal details up to date.',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textSubtle,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 18),
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(20),
                              border:
                                  Border.all(color: AppColors.borderNeutral),
                            ),
                            child: Column(
                              children: [
                                CircleAvatar(
                                  radius: 43,
                                  backgroundColor: AppColors.softRose,
                                  foregroundImage: _profileImage == null
                                      ? null
                                      : FileImage(File(_profileImage!.path)),
                                  child: const Icon(Icons.person_outline,
                                      size: 38, color: AppColors.primary),
                                ),
                                const SizedBox(height: 4),
                                TextButton.icon(
                                  onPressed: _saving
                                      ? null
                                      : () async {
                                          final image =
                                              await ImagePicker().pickImage(
                                            source: ImageSource.gallery,
                                            imageQuality: 85,
                                          );
                                          if (image != null && mounted) {
                                            setState(
                                                () => _profileImage = image);
                                          }
                                        },
                                  icon: const Icon(
                                    Icons.photo_camera_outlined,
                                    size: 18,
                                  ),
                                  label: const Text('Choose profile photo'),
                                ),
                              ],
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.only(bottom: 8),
                            child: Text(
                              'PERSONAL INFORMATION',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: AppColors.textSubtle,
                              ),
                            ),
                          ),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(18),
                              border:
                                  Border.all(color: AppColors.borderNeutral),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildLabel('FIRST NAME'),
                                _buildTextField(
                                  controller: _firstNameController,
                                  icon: Icons.person_outline_rounded,
                                ),
                                _buildLabel('LAST NAME'),
                                _buildTextField(
                                  controller: _lastNameController,
                                  icon: Icons.person_outline_rounded,
                                ),
                                _buildLabel('MIDDLE NAME'),
                                _buildTextField(
                                  controller: _middleNameController,
                                  icon: Icons.badge_outlined,
                                ),
                                _buildLabel('EMAIL ADDRESS'),
                                _buildTextField(
                                  controller: _emailController,
                                  enabled: false,
                                  icon: Icons.mail_outline_rounded,
                                ),
                                _buildLabel('CONTACT NUMBER'),
                                _buildTextField(
                                  controller: _phoneController,
                                  keyboardType: TextInputType.phone,
                                  icon: Icons.call_outlined,
                                ),
                              ],
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.fromLTRB(4, 10, 4, 0),
                            child: Text(
                              'Your email address is linked to your account and cannot be changed here.',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 10,
                                color: AppColors.textSubtle,
                                height: 1.4,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _saving ? null : _handleSave,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppColors.white),
                        )
                      : const Text(
                          'Save Changes',
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

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 11, bottom: 5),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    bool enabled = true,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: enabled ? AppColors.white : AppColors.surfaceNeutral,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderNeutral),
      ),
      child: TextField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.darkGray,
          fontFamily: 'Poppins',
        ),
        decoration: InputDecoration(
          prefixIcon: Icon(
            icon,
            size: 18,
            color: enabled ? AppColors.textSubtle : AppColors.gray,
          ),
          suffixIcon: enabled
              ? null
              : const Icon(
                  Icons.lock_outline_rounded,
                  size: 16,
                  color: AppColors.textSubtle,
                ),
          border: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}
