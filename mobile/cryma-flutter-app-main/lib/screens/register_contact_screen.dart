import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/colors.dart';
import '../utils/validators.dart';

class RegisterContactScreen extends StatefulWidget {
  const RegisterContactScreen({
    super.key,
    this.personalData,
  });

  final Map<String, dynamic>? personalData;

  @override
  State<RegisterContactScreen> createState() => _RegisterContactScreenState();
}

class _RegisterContactScreenState extends State<RegisterContactScreen> {
  // ============================================================
  // TEXT CONTROLLERS
  // ============================================================
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _contactNumberController =
      TextEditingController();

  // ✅ NEW: GlobalKeys para sa validation
  final _formKey = GlobalKey<FormState>();
  final _emailKey = GlobalKey<FormFieldState>();
  final _contactKey = GlobalKey<FormFieldState>();

  // ============================================================
  // DISPOSE
  // ============================================================
  @override
  void dispose() {
    _emailController.dispose();
    _contactNumberController.dispose();
    super.dispose();
  }

  // ============================================================
  // ✅ UPDATED: CONTINUE with validation
  // ============================================================
  void _handleContinue() {
    // 1. Validate lahat ng fields
    final isEmailValid = _emailKey.currentState?.validate() ?? false;
    final isContactValid = _contactKey.currentState?.validate() ?? false;

    // ⛔ Kung may invalid, hindi mag-proceed
    if (!isEmailValid || !isContactValid) {
      return;
    }

    final email = _emailController.text.trim();
    final contactNumber = _contactNumberController.text.trim();

    final contactData = {
      'email': email,
      'contactNumber': contactNumber,
    };

    Navigator.pushNamed(
      context,
      '/register_address',
      arguments: {
        'personalData': widget.personalData ?? {},
        'contactData': contactData,
      },
    );
  }

  // ============================================================
  // ALERT (for non-field errors)
  // ============================================================
  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text(
            'Error',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontWeight: FontWeight.w600,
            ),
          ),
          content: Text(
            message,
            style: const TextStyle(
              fontFamily: 'Poppins',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: const Text(
                'OK',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // ============================================================
  // BUILD
  // ============================================================
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
          child: Form(
            // ✅ NEW: Form wrapper
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
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
                      onPressed: () {
                        Navigator.pop(context);
                      },
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
                _buildStepper(currentStep: 2),
                const SizedBox(height: 14),

                // INTRO TEXT
                const Text(
                  'Provide your contact details so we can reach you.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 22),

                // EMAIL LABEL
                _buildLabel('E-MAIL ADDRESS *'),
                const SizedBox(height: 6),

                // ✅ UPDATED: EMAIL FIELD with validation
                _buildInputField(
                  controller: _emailController,
                  hintText: 'juan@email.com',
                  icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  fieldKey: _emailKey,
                  validator: AppValidators.email,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(100),
                    FilteringTextInputFormatter.deny(RegExp(r'\s')),
                  ],
                ),
                const SizedBox(height: 8),

                // EMAIL VERIFICATION CONTAINER (walang binago)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFFAF5),
                    border: Border.all(
                      color: const Color(0xFFD6EEE3),
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(
                          Icons.email_outlined,
                          size: 18,
                          color: Color(0xFF9CCFC0),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'A verification link will be sent to this email after registration.',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF687477),
                            fontFamily: 'Poppins',
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),

                // CONTACT NUMBER LABEL
                _buildLabel('CONTACT NUMBER *'),
                const SizedBox(height: 6),

                // ✅ UPDATED: CONTACT NUMBER with 11-digit limit
                _buildInputField(
                  controller: _contactNumberController,
                  hintText: '09171234567', // ✅ updated hint
                  icon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  fieldKey: _contactKey,
                  validator: AppValidators.mobileNumber, // ✅ NEW
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly, // ✅ numbers only
                    LengthLimitingTextInputFormatter(11), // ✅ max 11 digits
                  ],
                ),

                const SizedBox(height: 30),

                // CONTINUE BUTTON
                SizedBox(
                  width: double.infinity,
                  height: screenHeight * 0.065,
                  child: ElevatedButton(
                    onPressed: _handleContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      elevation: 0,
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

  // ============================================================
  // LABEL
  // ============================================================
  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  // ============================================================
  // ✅ UPDATED: INPUT FIELD with validation + inputFormatters
  // ============================================================
  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    required TextInputType keyboardType,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
    GlobalKey<FormFieldState>? fieldKey,
  }) {
    return Container(
      decoration: BoxDecoration(
        // ✅ removed fixed height for error text
        color: AppColors.white,
        border: Border.all(
          color: AppColors.lightGray,
          width: 1.5,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: TextFormField(
        // ✅ UPDATED: TextField → TextFormField
        key: fieldKey,
        controller: controller,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.left,
        keyboardType: keyboardType,
        validator: validator,
        inputFormatters: inputFormatters,
        style: const TextStyle(
          fontSize: 13,
          color: AppColors.darkGray,
          fontFamily: 'Poppins',
        ),
        decoration: InputDecoration(
          border: InputBorder.none,
          prefixIcon: Icon(
            icon,
            color: const Color(0xFFB0B6B7),
            size: 22,
          ),
          hintText: hintText,
          hintStyle: const TextStyle(
            fontSize: 13,
            color: Color(0xFFB0B6B7),
            fontFamily: 'Poppins',
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 15,
          ),
          // ✅ NEW: error style
          errorStyle: const TextStyle(
            fontSize: 11,
            fontFamily: 'Poppins',
            height: 1.3,
          ),
          errorMaxLines: 2,
        ),
      ),
    );
  }
}
