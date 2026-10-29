import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

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

  Future<void> _loadUser() async {
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
      final response = await ApiService.instance.patch(
        '/api/account/profile',
        authenticated: true,
        body: {
          'first_name': _firstNameController.text.trim(),
          'last_name': _lastNameController.text.trim(),
          'middle_name': _middleNameController.text.trim(),
          'phone': _phoneController.text.trim(),
        },
      );
      // Update stored user
      final updatedUser = response['user'];
      if (updatedUser is Map<String, dynamic>) {
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update profile.')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, size: 22, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Expanded(
                    child: Text('Edit Profile', textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary, fontFamily: 'Poppins')),
                  ),
                  const SizedBox(width: 36),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('FIRST NAME'),
                          _buildTextField(controller: _firstNameController),
                          _buildLabel('LAST NAME'),
                          _buildTextField(controller: _lastNameController),
                          _buildLabel('MIDDLE NAME'),
                          _buildTextField(controller: _middleNameController),
                          _buildLabel('EMAIL ADDRESS'),
                          _buildTextField(controller: _emailController, enabled: false),
                          _buildLabel('CONTACT NUMBER'),
                          _buildTextField(controller: _phoneController, keyboardType: TextInputType.phone),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _handleSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _saving
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                      : const Text('Save Changes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.white, fontFamily: 'Poppins')),
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
      padding: const EdgeInsets.only(top: 10, bottom: 3),
      child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary, fontFamily: 'Poppins')),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    bool enabled = true,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: enabled ? AppColors.white : AppColors.lightGray,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: TextField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        style: const TextStyle(fontSize: 12, color: AppColors.darkGray, fontFamily: 'Poppins'),
        decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 9)),
      ),
    );
  }
}
