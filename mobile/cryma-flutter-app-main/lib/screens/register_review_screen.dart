import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

class RegisterReviewScreen extends StatefulWidget {
  const RegisterReviewScreen({
    super.key,
    required this.data,
    this.apiService,
  });

  final Map<String, dynamic> data;
  final ApiService? apiService;

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

  ApiService get _apiService => widget.apiService ?? ApiService.instance;

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
      final policies = await _apiService.getCurrentPolicies();
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
      final response = await _apiService.register(
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

  void _editSection(String routeName) {
    Navigator.popUntil(
      context,
      (route) => route.settings.name == routeName,
    );
  }

  String _displayPhone() {
    final phone = _contact['contactNumber']?.toString() ?? '';
    final normalized = BuyerRegistrationRules.normalizePhone(phone);
    return normalized.startsWith('+63')
        ? '+63 ${normalized.substring(3)}'
        : phone;
  }

  String _displayBirthday() {
    final birthday = _personal['birthday']?.toString() ?? '';
    final parsed = DateTime.tryParse(birthday);
    return parsed == null ? birthday : DateFormat('MM/dd/yyyy').format(parsed);
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
          child: RegistrationCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const RegistrationProgressHeader(currentStep: 5),
                const SizedBox(height: 22),
                const Text(
                  'Review your application',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'Confirm your information and uploaded ID before submitting.',
                  style: TextStyle(
                    color: AppColors.gray,
                    fontSize: 13,
                    height: 1.5,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 18),
                _reviewSection(
                  'Personal information',
                  [
                    ('Full name', fullName),
                    ('Sex', _personal['sex']?.toString() ?? ''),
                    ('Birthday', _displayBirthday()),
                    if (_personal['age'] != null)
                      ('Age', '${_personal['age']} years old'),
                  ],
                  onEdit: () => _editSection('/register_personal'),
                ),
                _reviewSection(
                  'Contact and delivery address',
                  [
                    ('Mobile', _displayPhone()),
                    ('Region', _address['region']?.toString() ?? ''),
                    ('Province', _address['province']?.toString() ?? ''),
                    (
                      'City / municipality',
                      _address['municipality']?.toString() ?? ''
                    ),
                    ('Barangay', _address['barangay']?.toString() ?? ''),
                    ('House / lot', _address['houseNumber']?.toString() ?? ''),
                    ('Street', _address['street']?.toString() ?? ''),
                    ('Building', _address['buildingName']?.toString() ?? ''),
                    ('Unit', _address['unitNumber']?.toString() ?? ''),
                    ('Postal code', _address['postalCode']?.toString() ?? ''),
                  ],
                  onEdit: () => _editSection('/register_address'),
                ),
                _reviewSection(
                  'Login credentials',
                  [
                    ('Email', _contact['email']?.toString() ?? ''),
                    ('Password', 'Set'),
                  ],
                  onEdit: () => _editSection('/register_account'),
                ),
                _reviewSection(
                  'Verification document',
                  [('Valid ID', fileName ?? '')],
                  onEdit: () => _editSection('/register_id'),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.lightGray),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Before you submit',
                        style: TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 6),
                      _consentTile(
                        value: _termsAccepted,
                        title:
                            'I have read and agree to the Terms and Conditions.',
                        onChanged: _loadingPolicies
                            ? null
                            : (value) => setState(() {
                                  _termsAccepted = value ?? false;
                                  _message = null;
                                }),
                      ),
                      _consentTile(
                        value: _privacyAcknowledged,
                        title: 'I acknowledge the Privacy Notice.',
                        onChanged: _loadingPolicies
                            ? null
                            : (value) => setState(() {
                                  _privacyAcknowledged = value ?? false;
                                  _message = null;
                                }),
                      ),
                    ],
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
      ),
    );
  }

  Widget _reviewSection(
    String title,
    List<(String, String)> entries, {
    required VoidCallback onEdit,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.primaryDark,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
              TextButton(
                onPressed: onEdit,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(44, 38),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  textStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                child: const Text('Edit'),
              ),
            ],
          ),
          const SizedBox(height: 5),
          for (final (label, value) in entries)
            if (value.trim().isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 108,
                      child: Text(
                        label,
                        style: const TextStyle(
                          color: AppColors.textSubtle,
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
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.35,
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

  Widget _consentTile({
    required bool value,
    required String title,
    required ValueChanged<bool?>? onChanged,
  }) {
    return Material(
      color: Colors.transparent,
      child: CheckboxListTile(
        value: value,
        onChanged: onChanged,
        contentPadding: EdgeInsets.zero,
        dense: true,
        visualDensity: const VisualDensity(horizontal: -3, vertical: -2),
        controlAffinity: ListTileControlAffinity.leading,
        activeColor: AppColors.primary,
        title: Text(
          title,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
            height: 1.35,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }
}
