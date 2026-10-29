import 'package:flutter/material.dart';
import '../utils/colors.dart';

class RegisterIDScreen extends StatefulWidget {
  const RegisterIDScreen({
    super.key,
    this.personalData,
    this.contactData,
    this.addressData,
  });

  final Map<String, dynamic>? personalData;
  final Map<String, dynamic>? contactData;
  final Map<String, dynamic>? addressData;

  @override
  State<RegisterIDScreen> createState() => _RegisterIDScreenState();
}

class _RegisterIDScreenState extends State<RegisterIDScreen> {
  String? _selectedFile;

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Error',
          style: TextStyle(
            fontFamily: 'Poppins',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          message,
          style: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'OK',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 14,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleContinue() {
    if (_selectedFile == null) {
      _showAlert('Please upload a valid ID.');
      return;
    }

    final combinedData = {
      'personalData': widget.personalData ?? {},
      'contactData': widget.contactData ?? {},
      'addressData': widget.addressData ?? {},
      'idFile': _selectedFile,
    };

    Navigator.pushNamed(
      context,
      '/register_account',
      arguments: combinedData,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: screenWidth * 0.05,
            vertical: screenHeight * 0.02,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // HEADER
              Row(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.arrow_back,
                      color: AppColors.primary,
                    ),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Create Account',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                ],
              ),
              const SizedBox(height: 10),

              // STEPPER
              _buildStepper(currentStep: 4),
              const SizedBox(height: 14),

              // TITLE
              const Text(
                'Identity Verification',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 4),

              // DESCRIPTION
              const Text(
                'Please upload a valid government-issued ID to verify your identity. This helps keep CRYMA safe for everyone.',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 18),

              // UPLOAD CONTAINER
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 28,
                ),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.lightGray,
                    width: 1.5,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Upload icon
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F3F1),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.file_upload_outlined,
                          color: AppColors.primary,
                          size: 38,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Upload title
                    const Text(
                      'Upload Valid ID',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Supported files
                    const Text(
                      'JPG, PNG or PDF supported',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Maximum file size: 5MB',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Choose File
                    SizedBox(
                      height: 46,
                      child: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _selectedFile = 'sample-id.jpg';
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE8F3F1),
                          foregroundColor: AppColors.primary,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 28),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Choose File',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                    ),

                    if (_selectedFile != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        '✓ $_selectedFile',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ACCEPTED IDS
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'Accepted: PhilSys ID, Driver\'s License, Passport, Voter\'s ID, SSS/GSIS Card',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // CONTINUE BUTTON
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Continue',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.white,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // ============================================================
  // STEPPER
  // ============================================================
  Widget _buildStepper({required int currentStep}) {
    final List<String> steps = [
      'Personal',
      'Contact',
      'Address',
      'Verify',
      'Account',
    ];

    return SizedBox(
      height: 64,
      child: Stack(
        children: [
          Positioned(
            left: 26,
            right: 26,
            top: 18,
            child: Row(
              children: List.generate(steps.length - 1, (index) {
                final isCompleted = index + 1 < currentStep;

                return Expanded(
                  child: Container(
                    height: 2,
                    color:
                        isCompleted ? AppColors.primary : AppColors.lightGray,
                  ),
                );
              }),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: steps.asMap().entries.map((entry) {
              final index = entry.key;
              final label = entry.value;
              final stepNumber = index + 1;

              final isCurrent = stepNumber == currentStep;
              final isCompleted = stepNumber < currentStep;

              return SizedBox(
                width: 50,
                child: Column(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCurrent || isCompleted
                            ? AppColors.primary
                            : AppColors.lightGray,
                      ),
                      child: Center(
                        child: isCompleted
                            ? const Icon(
                                Icons.check,
                                color: AppColors.white,
                                size: 18,
                              )
                            : Text(
                                stepNumber.toString(),
                                style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isCurrent
                                      ? AppColors.white
                                      : AppColors.gray,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 9,
                        fontWeight: isCurrent || isCompleted
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isCurrent || isCompleted
                            ? AppColors.primary
                            : AppColors.gray,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
