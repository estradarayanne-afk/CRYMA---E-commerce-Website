import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

class RegisterIDScreen extends StatefulWidget {
  const RegisterIDScreen({
    super.key,
    this.personalData,
    this.contactData,
    this.addressData,
    this.password,
    this.passwordConfirmation,
  });

  final Map<String, dynamic>? personalData;
  final Map<String, dynamic>? contactData;
  final Map<String, dynamic>? addressData;
  final String? password;
  final String? passwordConfirmation;

  @override
  State<RegisterIDScreen> createState() => _RegisterIDScreenState();
}

class _RegisterIDScreenState extends State<RegisterIDScreen> {
  String? _selectedFile;
  String? _selectedFileName;
  String? _fileError;

  @override
  void initState() {
    super.initState();
    BuyerRegistrationErrorStore.instance.addListener(_onServerErrorsChanged);
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    super.dispose();
  }

  void _onServerErrorsChanged() {
    if (mounted) setState(() {});
  }

  String? _serverError(String field) =>
      BuyerRegistrationErrorStore.instance.errorFor(field);

  Future<void> _pickFile() async {
    FilePickerResult? result;
    try {
      result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf'],
      );
    } on PlatformException catch (error) {
      if (mounted) {
        setState(
            () => _fileError = error.message ?? 'Unable to select a file.');
      }
      return;
    }
    if (result == null || result.files.isEmpty) return;
    final file = result.files.single;
    final fileError = BuyerRegistrationRules.validateDocument(
      name: file.name,
      size: file.size,
    );
    if (fileError != null || file.path == null) {
      setState(() {
        _fileError = fileError ?? 'The selected file could not be opened.';
      });
      return;
    }
    BuyerRegistrationErrorStore.instance.clearField('valid_id');
    setState(() {
      _selectedFile = file.path;
      _selectedFileName = file.name;
      _fileError = null;
    });
  }

  void _handleContinue() {
    if (_selectedFile == null || _serverError('valid_id') != null) {
      setState(
          () => _fileError = _serverError('valid_id') ?? 'Upload a valid ID.');
      return;
    }

    final combinedData = {
      'personalData': widget.personalData ?? {},
      'contactData': widget.contactData ?? {},
      'addressData': widget.addressData ?? {},
      'idFile': _selectedFile,
      'password': widget.password ?? '',
      'passwordConfirmation': widget.passwordConfirmation ?? '',
    };

    Navigator.pushNamed(
      context,
      '/register_review',
      arguments: combinedData,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.background,
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
                      'JPG, JPEG, PNG or PDF supported',
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
                        onPressed: _pickFile,
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
                        '✓ $_selectedFileName',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                    if (_fileError != null ||
                        _serverError('valid_id') != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _serverError('valid_id') ?? _fileError!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 11,
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
    return RegistrationProgressHeader(currentStep: currentStep);
  }
}
