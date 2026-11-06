import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

class RegisterReviewScreen extends StatefulWidget {
  const RegisterReviewScreen({
    super.key,
    required this.data,
  });

  final Map<String, dynamic> data;

  @override
  State<RegisterReviewScreen> createState() => _RegisterReviewScreenState();
}

class _RegisterReviewScreenState extends State<RegisterReviewScreen> {
  bool _termsAccepted = false;
  bool _privacyAcknowledged = false;
  bool _loadingPolicies = true;
  bool _submitting = false;
  String? _message;
  String? _termsVersion;
  String? _privacyVersion;

  Map<String, dynamic> get _personal =>
      (widget.data['personalData'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get _contact =>
      (widget.data['contactData'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get _address =>
      (widget.data['addressData'] as Map<String, dynamic>?) ?? {};

  @override
  void initState() {
    super.initState();
    _loadPolicies();
  }

  Future<void> _loadPolicies() async {
    setState(() {
      _loadingPolicies = true;
      _message = null;
    });
    try {
      final policies = await ApiService.instance.getCurrentPolicies();
      final terms = policies['terms'];
      final privacy = policies['privacy'];
      final termsVersion =
          terms is Map<String, dynamic> ? terms['version']?.toString() : null;
      final privacyVersion = privacy is Map<String, dynamic>
          ? privacy['version']?.toString()
          : null;
      if (termsVersion == null ||
          termsVersion.isEmpty ||
          privacyVersion == null ||
          privacyVersion.isEmpty) {
        throw const ApiException(
          'Current policy versions are unavailable. Please try again later.',
        );
      }
      if (!mounted) return;
      setState(() {
        _termsVersion = termsVersion;
        _privacyVersion = privacyVersion;
        _loadingPolicies = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _message = error.message;
        _loadingPolicies = false;
      });
    } on Exception {
      if (!mounted) return;
      setState(() {
        _message = 'Unable to load current policies. Check your connection.';
        _loadingPolicies = false;
      });
    }
  }

  Future<void> _submit() async {
    final consentError = BuyerRegistrationRules.validateConsent(
      termsAccepted: _termsAccepted,
      privacyAcknowledged: _privacyAcknowledged,
    );
    if (consentError != null) {
      setState(() => _message = consentError);
      return;
    }
    if (_termsVersion == null || _privacyVersion == null) {
      setState(() => _message = 'Current policy versions are unavailable.');
      return;
    }
    if (_submitting) return;

    setState(() {
      _submitting = true;
      _message = null;
    });
    BuyerRegistrationErrorStore.instance.clear();

    final fields = BuyerRegistrationRules.buildPayload(
      personal: _personal,
      contact: _contact,
      address: _address,
      password: widget.data['password'] as String? ?? '',
      passwordConfirmation:
          widget.data['passwordConfirmation'] as String? ?? '',
      termsVersion: _termsVersion!,
      privacyVersion: _privacyVersion!,
    );

    try {
      final response = await ApiService.instance.register(
        fields: fields,
        validIdPath: widget.data['idFile'] as String? ?? '',
      );
      final data = response['data'];
      final email =
          data is Map<String, dynamic> ? data['email']?.toString() : null;
      if (response['success'] != true ||
          email == null ||
          email.isEmpty ||
          (data is Map<String, dynamic> && data['email_verified'] == true)) {
        setState(() {
          _message =
              'CRYMA did not confirm the registration. Please try again.';
          _submitting = false;
        });
        return;
      }
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/otp_verification',
        (route) => false,
        arguments: {'email': email},
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.responseData['registration_saved'] == true) {
        final email = (_contact['email'] as String? ?? '').trim().toLowerCase();
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/otp_verification',
          (route) => false,
          arguments: {
            'email': email,
            'deliveryFailed': true,
            'notice': error.responseData['message']?.toString(),
          },
        );
        return;
      }
      if (error.fieldErrors.isNotEmpty) {
        BuyerRegistrationErrorStore.instance.setErrors(error.fieldErrors);
        final firstRoutedField = error.fieldErrors.keys.firstWhere(
          (field) => BuyerRegistrationRules.routeForField(field) != null,
          orElse: () => '',
        );
        final route = BuyerRegistrationRules.routeForField(firstRoutedField);
        if (route != null) {
          Navigator.popUntil(
            context,
            (routeEntry) => routeEntry.settings.name == route,
          );
          return;
        }
      }
      setState(() {
        _message = error.message;
        _submitting = false;
      });
    } on Exception {
      if (!mounted) return;
      setState(() {
        _message =
            'Unable to submit registration. Check your connection and try again.';
        _submitting = false;
      });
    }
  }

  String _addressSummary() {
    final parts = <String>[
      _address['unitNumber']?.toString() ?? '',
      _address['buildingName']?.toString() ?? '',
      _address['houseNumber']?.toString() ?? '',
      _address['street']?.toString() ?? '',
      _address['barangay']?.toString() ?? '',
      _address['municipality']?.toString() ?? '',
      _address['province']?.toString() ?? '',
      _address['region']?.toString() ?? '',
      _address['postalCode']?.toString() ?? '',
    ];
    return parts.where((part) => part.trim().isNotEmpty).join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final fullName = [
      _personal['firstName'],
      _personal['middleInitial'],
      _personal['lastName'],
    ].whereType<String>().where((part) => part.trim().isNotEmpty).join(' ');
    final fileName =
        widget.data['idFile']?.toString().split(RegExp(r'[/\\]')).last;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon:
                        const Icon(Icons.arrow_back, color: AppColors.primary),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Review Registration',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const RegistrationProgressHeader(currentStep: 5),
              const SizedBox(height: 18),
              const Text(
                'Check your information',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 10),
              _reviewSection('Personal information', [
                ('Name', fullName),
                (
                  'Middle initial',
                  _personal['middleInitial']?.toString() ?? ''
                ),
                ('Sex', _personal['sex']?.toString() ?? ''),
                ('Birthday', _personal['birthday']?.toString() ?? ''),
              ]),
              _reviewSection('Contact and address', [
                ('Email', _contact['email']?.toString() ?? ''),
                ('Mobile', _contact['contactNumber']?.toString() ?? ''),
                ('Address', _addressSummary()),
              ]),
              _reviewSection('Identity document', [
                ('File', fileName ?? ''),
              ]),
              const SizedBox(height: 14),
              const Text(
                'Consent',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 6),
              CheckboxListTile(
                value: _termsAccepted,
                onChanged: _loadingPolicies
                    ? null
                    : (value) => setState(() {
                          _termsAccepted = value ?? false;
                          _message = null;
                        }),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text(
                  'I accept the Terms and Conditions.',
                  style: TextStyle(fontSize: 12, fontFamily: 'Poppins'),
                ),
              ),
              CheckboxListTile(
                value: _privacyAcknowledged,
                onChanged: _loadingPolicies
                    ? null
                    : (value) => setState(() {
                          _privacyAcknowledged = value ?? false;
                          _message = null;
                        }),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text(
                  'I acknowledge the Privacy Notice.',
                  style: TextStyle(fontSize: 12, fontFamily: 'Poppins'),
                ),
              ),
              if (_termsVersion != null && _privacyVersion != null)
                Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: Text(
                    'Policy versions: Terms $_termsVersion · Privacy $_privacyVersion',
                    style: const TextStyle(
                      color: AppColors.gray,
                      fontSize: 10,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              if (_message != null) ...[
                const SizedBox(height: 8),
                Text(
                  _message!,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 12,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loadingPolicies || _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _loadingPolicies || _submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.white,
                          ),
                        )
                      : const Text('Submit registration'),
                ),
              ),
              if (_message != null &&
                  !_loadingPolicies &&
                  _termsVersion == null) ...[
                Center(
                  child: TextButton(
                    onPressed: _loadPolicies,
                    child: const Text('Retry loading policies'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _reviewSection(String title, List<(String, String)> entries) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          for (final (label, value) in entries)
            if (value.trim().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 96,
                      child: Text(
                        label,
                        style: const TextStyle(
                          color: AppColors.gray,
                          fontSize: 11,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        value,
                        style: const TextStyle(
                          color: AppColors.darkGray,
                          fontSize: 11,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
