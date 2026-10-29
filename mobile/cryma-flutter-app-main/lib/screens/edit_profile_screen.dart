import 'package:flutter/material.dart';
import '../utils/colors.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final TextEditingController _firstNameController =
      TextEditingController(text: 'Juan');
  final TextEditingController _lastNameController =
      TextEditingController(text: 'Dela Cruz');
  final TextEditingController _middleInitialController =
      TextEditingController(text: 'R.');
  final TextEditingController _emailController =
      TextEditingController(text: 'juan.delacruz@email.com');
  final TextEditingController _contactController =
      TextEditingController(text: '+63 917 123 4567');

  final String _selectedSex = 'Male';
  final String _selectedBirthday = 'March 15, 1995';

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Success'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _handleSave() {
    _showAlert('Profile updated successfully!');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER
            // ============================================================
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
                    child: Text(
                      'Edit Profile',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                  const SizedBox(width: 36),
                ],
              ),
            ),

            // ============================================================
            // BODY
            // ============================================================
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  children: [
                    // ============================================================
                    // PROFILE PHOTO
                    // ============================================================
                    Column(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.lightGray,
                                image: DecorationImage(
                                  image: NetworkImage(
                                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
                                  ),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: -2,
                              right: -2,
                              child: Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: AppColors.white, width: 2.5),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.15),
                                      blurRadius: 3,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.edit,
                                  size: 14,
                                  color: AppColors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: () {
                            // Change photo
                          },
                          child: const Text(
                            'Change Photo',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.primary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // ============================================================
                    // FORM
                    // ============================================================
                    _buildLabel('FIRST NAME'),
                    _buildTextField(controller: _firstNameController),
                    const SizedBox(height: 6),

                    _buildLabel('LAST NAME'),
                    _buildTextField(controller: _lastNameController),
                    const SizedBox(height: 6),

                    _buildLabel('MIDDLE INITIAL'),
                    _buildTextField(controller: _middleInitialController),
                    const SizedBox(height: 6),

                    _buildLabel('SEX'),
                    _buildDropdown(
                      value: _selectedSex,
                      onTap: () {
                        // Show sex options
                      },
                    ),
                    const SizedBox(height: 6),

                    _buildLabel('BIRTHDAY'),
                    _buildDropdown(
                      value: _selectedBirthday,
                      onTap: () {
                        // Show date picker
                      },
                    ),
                    const SizedBox(height: 6),

                    _buildLabel('EMAIL ADDRESS'),
                    _buildTextFieldWithIcon(
                      controller: _emailController,
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 6),

                    _buildLabel('CONTACT NUMBER'),
                    _buildTextFieldWithIcon(
                      controller: _contactController,
                      icon: Icons.call_outlined,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),

            // ============================================================
            // SAVE BUTTON
            // ============================================================
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
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

  // ============================================================
  // LABEL
  // ============================================================
  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 3),
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

  // ============================================================
  // TEXT FIELD
  // ============================================================
  Widget _buildTextField({
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.darkGray,
          fontFamily: 'Poppins',
        ),
        decoration: const InputDecoration(
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        ),
      ),
    );
  }

  // ============================================================
  // TEXT FIELD WITH ICON
  // ============================================================
  Widget _buildTextFieldWithIcon({
    required TextEditingController controller,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          Icon(icon, size: 18, color: AppColors.gray),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
              decoration: const InputDecoration(
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 9),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // DROPDOWN
  // ============================================================
  Widget _buildDropdown({
    required String value,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.lightGray),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 18, color: AppColors.gray),
          ],
        ),
      ),
    );
  }
}