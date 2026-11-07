import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../../../utils/auth_widgets.dart';
import '../../../utils/buyer_registration.dart';
import '../../../utils/colors.dart';

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
  int? _selectedFileSize;
  Uint8List? _selectedPreviewBytes;
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
        withData: true,
      );
    } on PlatformException catch (error) {
      if (mounted) {
        setState(
            () => _fileError = error.message ?? 'Unable to select a file.');
      }
      return;
    }
    if (result == null || result.files.isEmpty) return;
    if (!mounted) return;
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
      _selectedFileSize = file.size;
      _selectedPreviewBytes = file.bytes;
      _fileError = null;
    });
  }

  String _displayFileName() {
    final name = _selectedFileName ?? 'Selected file';
    if (name.length <= 32 && !RegExp(r'^\d{8,}').hasMatch(name)) return name;
    final extension = name.contains('.') ? name.split('.').last : '';
    return extension.isEmpty
        ? 'Government_ID'
        : 'Government_ID.${extension.toLowerCase()}';
  }

  String _formatFileSize(int? bytes) {
    if (bytes == null || bytes <= 0) return '';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).ceil()} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
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
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: screenWidth * 0.05,
            vertical: screenHeight * 0.02,
          ),
          child: RegistrationCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // STEPPER
                _buildStepper(currentStep: 4),
                const SizedBox(height: 22),

                // TITLE
                const Text(
                  'Verification documents',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
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

                // ID DOCUMENT PICKER
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: _selectedFile == null
                          ? AppColors.lightGray
                          : AppColors.primary,
                      width: _selectedFile == null ? 1 : 1.5,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_selectedFile == null) ...[
                        Align(
                          child: Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: AppColors.softRose,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(
                              Icons.badge_outlined,
                              color: AppColors.primary,
                              size: 32,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Upload Government ID (JPG, PNG, PDF)',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryDark,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 5),
                        const Text(
                          'Your ID image is used to verify your identity and keep CRYMA safe.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.gray,
                            height: 1.45,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 18),
                        _fileRequirements(),
                        const SizedBox(height: 16),
                        _chooseFileButton('Choose file'),
                      ] else ...[
                        Align(
                          child: Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: AppColors.softRose,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(
                              Icons.check_circle_rounded,
                              color: AppColors.success,
                              size: 38,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          '✓ ID Uploaded',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.success,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 5),
                        const Text(
                          'Your ID image is ready for submission.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 18),
                        _fileRequirements(),
                        const SizedBox(height: 14),
                        SizedBox(
                          height: 48,
                          child: OutlinedButton.icon(
                            onPressed: _pickFile,
                            icon: const Icon(Icons.refresh_rounded, size: 19),
                            label: const Text('Replace File'),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: AppColors.softRose,
                              foregroundColor: AppColors.primary,
                              side: BorderSide.none,
                              textStyle: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                fontFamily: 'Poppins',
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(15),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.successSoft,
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(
                              color: AppColors.success.withValues(alpha: .25),
                            ),
                          ),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: _selectedPreviewBytes != null &&
                                        !(_selectedFileName
                                                ?.toLowerCase()
                                                .endsWith('.pdf') ??
                                            false)
                                    ? Image.memory(
                                        _selectedPreviewBytes!,
                                        width: 42,
                                        height: 42,
                                        fit: BoxFit.cover,
                                      )
                                    : const SizedBox(
                                        width: 42,
                                        height: 42,
                                        child: Icon(
                                          Icons.description_outlined,
                                          color: AppColors.success,
                                          size: 22,
                                        ),
                                      ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _displayFileName(),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: AppColors.primaryDark,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatFileSize(_selectedFileSize),
                                      style: const TextStyle(
                                        color: AppColors.gray,
                                        fontSize: 10,
                                        fontFamily: 'Poppins',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.success,
                                size: 21,
                              ),
                            ],
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
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.softRose,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Accepted government IDs',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                fontFamily: 'Poppins',
                              ),
                            ),
                            SizedBox(height: 5),
                            Text(
                              'PhilSys ID, Driver’s License, Passport, Voter’s ID, SSS/GSIS Card.',
                              style: TextStyle(
                                color: AppColors.gray,
                                fontSize: 11,
                                height: 1.45,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
      ),
    );
  }

  // ============================================================
  // STEPPER
  // ============================================================
  Widget _buildStepper({required int currentStep}) {
    return RegistrationProgressHeader(currentStep: currentStep);
  }

  Widget _fileRequirements() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: const Column(
        children: [
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Icon(Icons.image_outlined, color: AppColors.gray, size: 17),
              Text(
                'JPG, JPEG, PNG or PDF',
                style: TextStyle(
                  color: AppColors.gray,
                  fontSize: 12,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
          SizedBox(height: 5),
          Text(
            'Maximum file size: 5 MB',
            style: TextStyle(
              color: AppColors.gray,
              fontSize: 11,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  Widget _chooseFileButton(String label) {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: _pickFile,
        icon: const Icon(Icons.file_upload_outlined, size: 19),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
        ),
      ),
    );
  }
}
