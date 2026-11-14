import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/address_service.dart';
import '../../services/api_client.dart';
import '../../services/rider_auth_service.dart';
import '../../theme.dart';

const _websiteBaseUrl = String.fromEnvironment(
  'WEBSITE_BASE_URL',
  defaultValue: 'http://127.0.0.1:5173',
);
const _documentLimitBytes = 5 * 1024 * 1024;
const _namePattern = r"^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$";
const _vehicleTypes = ['motorcycle', 'tricycle', 'car', 'van', 'truck'];
const _documentFields = {
  'valid_id': 'Valid government ID',
  'or_cr': 'Vehicle OR/CR',
  'drivers_license': "Driver's license",
};

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = RiderAuthService.instance;
  final _addressService = AddressService.instance;
  final _firstName = TextEditingController();
  final _middleName = TextEditingController();
  final _lastName = TextEditingController();
  final _birthday = TextEditingController();
  final _phone = TextEditingController();
  final _houseNumber = TextEditingController();
  final _street = TextEditingController();
  final _buildingName = TextEditingController();
  final _unitNumber = TextEditingController();
  final _postalCode = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _passwordConfirmation = TextEditingController();
  final _plateNumber = TextEditingController();
  final _otp = TextEditingController();

  final Map<String, PlatformFile?> _documents = {
    for (final field in _documentFields.keys) field: null,
  };
  final Map<String, String?> _documentErrors = {
    for (final field in _documentFields.keys) field: null,
  };

  List<PsgcEntry> _regions = [];
  List<PsgcEntry> _provinces = [];
  List<PsgcEntry> _municipalities = [];
  List<PsgcEntry> _barangays = [];
  PsgcEntry? _region;
  PsgcEntry? _province;
  PsgcEntry? _municipality;
  PsgcEntry? _barangay;
  RiderRegistrationPolicies? _policies;
  String? _sex;
  String? _vehicleType;
  String? _errorMessage;
  String? _noticeMessage;
  String? _addressError;
  bool _loadingRegions = true;
  bool _loadingProvinces = false;
  bool _loadingMunicipalities = false;
  bool _loadingBarangays = false;
  bool _loadingPolicies = true;
  bool _submitting = false;
  bool _verifying = false;
  bool _resending = false;
  bool _termsAccepted = false;
  bool _privacyAcknowledged = false;
  bool _showVerification = false;
  bool _emailVerified = false;

  @override
  void initState() {
    super.initState();
    _loadPolicies();
    _loadRegions();
  }

  @override
  void dispose() {
    _firstName.dispose();
    _middleName.dispose();
    _lastName.dispose();
    _birthday.dispose();
    _phone.dispose();
    _houseNumber.dispose();
    _street.dispose();
    _buildingName.dispose();
    _unitNumber.dispose();
    _postalCode.dispose();
    _email.dispose();
    _password.dispose();
    _passwordConfirmation.dispose();
    _plateNumber.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _loadPolicies() async {
    try {
      final policies = await _authService.registrationPolicies();
      if (mounted) setState(() => _policies = policies);
    } on ApiException catch (error) {
      if (mounted) setState(() => _errorMessage = error.message);
    } catch (error) {
      if (mounted) {
        setState(() => _errorMessage = 'Could not load registration policies: $error');
      }
    } finally {
      if (mounted) setState(() => _loadingPolicies = false);
    }
  }

  Future<void> _loadRegions() async {
    try {
      final regions = await _addressService.getRegions();
      if (mounted) setState(() => _regions = regions);
    } on ApiException catch (error) {
      if (mounted) setState(() => _addressError = error.message);
    } catch (error) {
      if (mounted) setState(() => _addressError = 'Could not load regions: $error');
    } finally {
      if (mounted) setState(() => _loadingRegions = false);
    }
  }

  Future<void> _selectRegion(PsgcEntry? region) async {
    setState(() {
      _region = region;
      _province = null;
      _municipality = null;
      _barangay = null;
      _provinces = [];
      _municipalities = [];
      _barangays = [];
      _addressError = null;
      _loadingProvinces = region != null;
    });
    if (region == null) return;

    try {
      final provinces = await _addressService.getProvinces(region.code);
      if (!mounted || _region?.code != region.code) return;
      setState(() {
        _provinces = provinces;
        _loadingProvinces = false;
      });
      if (provinces.isEmpty) await _loadMunicipalities(region.code);
    } on ApiException catch (error) {
      if (mounted && _region?.code == region.code) {
        setState(() {
          _loadingProvinces = false;
          _addressError = error.message;
        });
      }
    } catch (error) {
      if (mounted && _region?.code == region.code) {
        setState(() {
          _loadingProvinces = false;
          _addressError = 'Could not load provinces: $error';
        });
      }
    }
  }

  Future<void> _selectProvince(PsgcEntry? province) async {
    setState(() {
      _province = province;
      _municipality = null;
      _barangay = null;
      _municipalities = [];
      _barangays = [];
      _addressError = null;
    });
    final regionCode = _region?.code;
    if (regionCode != null) {
      await _loadMunicipalities(regionCode, provinceCode: province?.code);
    }
  }

  Future<void> _loadMunicipalities(
    String regionCode, {
    String? provinceCode,
  }) async {
    setState(() {
      _loadingMunicipalities = true;
      _municipalities = [];
      _barangays = [];
      _municipality = null;
      _barangay = null;
      _addressError = null;
    });
    try {
      final municipalities = await _addressService.getMunicipalities(
        regionCode,
        provinceCode: provinceCode,
      );
      if (!mounted ||
          _region?.code != regionCode ||
          _province?.code != provinceCode) {
        return;
      }
      setState(() {
        _municipalities = municipalities;
        _loadingMunicipalities = false;
      });
    } on ApiException catch (error) {
      if (mounted && _region?.code == regionCode) {
        setState(() {
          _loadingMunicipalities = false;
          _addressError = error.message;
        });
      }
    } catch (error) {
      if (mounted && _region?.code == regionCode) {
        setState(() {
          _loadingMunicipalities = false;
          _addressError = 'Could not load cities or municipalities: $error';
        });
      }
    }
  }

  Future<void> _selectMunicipality(PsgcEntry? municipality) async {
    setState(() {
      _municipality = municipality;
      _barangay = null;
      _barangays = [];
      _addressError = null;
    });
    final regionCode = _region?.code;
    if (regionCode == null || municipality == null) return;

    setState(() => _loadingBarangays = true);
    try {
      final barangays = await _addressService.getBarangays(
        regionCode,
        municipality.code,
        provinceCode: _province?.code,
      );
      if (!mounted ||
          _region?.code != regionCode ||
          _municipality?.code != municipality.code) {
        return;
      }
      setState(() {
        _barangays = barangays;
        _loadingBarangays = false;
      });
    } on ApiException catch (error) {
      if (mounted && _municipality?.code == municipality.code) {
        setState(() {
          _loadingBarangays = false;
          _addressError = error.message;
        });
      }
    } catch (error) {
      if (mounted && _municipality?.code == municipality.code) {
        setState(() {
          _loadingBarangays = false;
          _addressError = 'Could not load barangays: $error';
        });
      }
    }
  }

  Future<void> _pickBirthday() async {
    final today = DateTime.now();
    final latestEligibleBirthday =
        DateTime(today.year - 18, today.month, today.day);
    final selected = await showDatePicker(
      context: context,
      initialDate: _birthday.text.isEmpty
          ? latestEligibleBirthday
          : DateTime.tryParse(_birthday.text) ?? latestEligibleBirthday,
      firstDate: DateTime(1900),
      lastDate: latestEligibleBirthday,
      helpText: 'Select your birthday',
    );
    if (selected == null) return;
    _birthday.text =
        '${selected.year.toString().padLeft(4, '0')}-'
        '${selected.month.toString().padLeft(2, '0')}-'
        '${selected.day.toString().padLeft(2, '0')}';
  }

  Future<void> _pickDocument(String field) async {
    setState(() {
      _documentErrors[field] = null;
      _errorMessage = null;
    });
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf'],
        allowMultiple: false,
      );
      if (result == null) return;
      final file = result.files.single;
      final extension = file.extension?.toLowerCase();
      if (extension == null ||
          !const {'jpg', 'jpeg', 'png', 'pdf'}.contains(extension)) {
        setState(() => _documentErrors[field] =
            'Choose a JPG, JPEG, PNG, or PDF file.');
        return;
      }
      if (file.size > _documentLimitBytes) {
        setState(() => _documentErrors[field] = 'The file must be 5 MB or smaller.');
        return;
      }
      if (file.path == null) {
        setState(() => _documentErrors[field] =
            'This file cannot be accessed. Choose a file stored on this device.');
        return;
      }
      setState(() => _documents[field] = file);
    } catch (error) {
      setState(() => _documentErrors[field] = 'Could not open the file picker: $error');
    }
  }

  String? _requiredText(
    String? value,
    String label, {
    int? maxLength,
  }) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return '$label is required.';
    if (maxLength != null && text.runes.length > maxLength) {
      return '$label must not exceed $maxLength characters.';
    }
    return null;
  }

  String? _validateName(String? value, String label, int maxLength) {
    final required = _requiredText(value, label, maxLength: maxLength);
    if (required != null) return required;
    if (!RegExp(_namePattern, unicode: true).hasMatch(value!.trim())) {
      return 'Use letters, spaces, hyphens, or apostrophes for $label.';
    }
    return null;
  }

  String? _validateBirthday(String? value) {
    if (value == null || value.isEmpty) return 'Birthday is required.';
    final birthday = DateTime.tryParse(value);
    if (birthday == null || birthday.isAfter(DateTime.now())) {
      return 'Enter a valid birthday that is not in the future.';
    }
    final today = DateTime.now();
    var age = today.year - birthday.year;
    if (today.month < birthday.month ||
        (today.month == birthday.month && today.day < birthday.day)) {
      age--;
    }
    if (age < 18) return 'You must be at least 18 years old to register.';
    return null;
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.length < 3 ||
        email.length > 254 ||
        !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    final password = value ?? '';
    if (password.length < 8 || password.length > 128) {
      return 'Password must be 8–128 characters.';
    }
    return null;
  }

  String? _validatePasswordConfirmation(String? value) {
    final confirmation = value ?? '';
    if (confirmation.length < 8 || confirmation.length > 128) {
      return 'Confirmation must be 8–128 characters.';
    }
    if (confirmation != _password.text) return 'Passwords do not match.';
    return null;
  }

  Future<void> _submitRegistration() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;
    if (_policies == null) {
      setState(() => _errorMessage =
          'Current registration policies are unavailable. Retry loading them before submitting.');
      return;
    }
    if (!_termsAccepted || !_privacyAcknowledged) {
      setState(() => _errorMessage =
          'Accept the Terms and Conditions and acknowledge the Privacy Notice to continue.');
      return;
    }
    final missingDocuments = _documentFields.keys
        .where((field) => _documents[field]?.path == null)
        .toList();
    if (missingDocuments.isNotEmpty) {
      final missingDocument = missingDocuments.first;
      setState(() => _documentErrors[missingDocument] =
          '${_documentFields[missingDocument]} is required.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
      _noticeMessage = null;
    });
    final phoneDigits = _phone.text.trim();
    final fields = <String, String>{
      'first_name': _firstName.text.trim(),
      'last_name': _lastName.text.trim(),
      'sex': _sex!,
      'birthday': _birthday.text,
      'phone': '+63${phoneDigits.substring(1)}',
      'role': 'rider',
      'terms_accepted': '1',
      'terms_version': _policies!.termsVersion,
      'privacy_notice_acknowledged': '1',
      'privacy_version': _policies!.privacyVersion,
      'region': _region!.name,
      'province': _province?.name ?? '',
      'municipality': _municipality!.name,
      'barangay': _barangay!.name,
      'psgc_code': _barangay!.code,
      'street': _street.text.trim(),
      'house_number': _houseNumber.text.trim(),
      'postal_code': _postalCode.text.trim(),
      'email': _email.text.trim().toLowerCase(),
      'password': _password.text,
      'password_confirmation': _passwordConfirmation.text,
      'vehicle_type': _vehicleType!,
      'plate_number': _plateNumber.text.trim(),
    };
    if (_middleName.text.trim().isNotEmpty) {
      fields['middle_name'] = _middleName.text.trim();
    }
    if (_buildingName.text.trim().isNotEmpty) {
      fields['building_name'] = _buildingName.text.trim();
    }
    if (_unitNumber.text.trim().isNotEmpty) {
      fields['unit_number'] = _unitNumber.text.trim();
    }

    try {
      await _authService.registerRider(
        fields: fields,
        documentPaths: {
          for (final field in _documentFields.keys)
            field: _documents[field]!.path!,
        },
      );
      if (mounted) {
        setState(() {
          _showVerification = true;
          _otp.clear();
          _noticeMessage =
              'Registration submitted. Enter the six-digit code to verify your email.';
        });
      }
    } on ApiException catch (error) {
      if (mounted && error.data?['registration_saved'] == true) {
        setState(() {
          _showVerification = true;
          _otp.clear();
          _noticeMessage = error.message;
          _errorMessage = null;
        });
      } else if (mounted) {
        setState(() => _errorMessage = error.message);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _errorMessage = 'Registration failed: $error');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _openExistingVerification() {
    final emailError = _validateEmail(_email.text);
    if (emailError != null) {
      setState(() => _errorMessage = emailError);
      return;
    }
    setState(() {
      _showVerification = true;
      _errorMessage = null;
      _noticeMessage = 'Enter the verification code sent to ${_email.text.trim()}.';
    });
  }

  Future<void> _verifyEmail() async {
    final emailError = _validateEmail(_email.text);
    if (emailError != null) {
      setState(() => _errorMessage = emailError);
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(_otp.text.trim())) {
      setState(() => _errorMessage = 'Enter the six-digit verification code.');
      return;
    }

    setState(() {
      _verifying = true;
      _errorMessage = null;
      _noticeMessage = null;
    });
    try {
      await _authService.verifyEmail(
        email: _email.text,
        otp: _otp.text.trim(),
      );
      if (mounted) {
        setState(() {
          _emailVerified = true;
          _noticeMessage =
              'Your email is verified. Your rider account is awaiting administrator approval.';
        });
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _errorMessage = error.message);
    } catch (error) {
      if (mounted) setState(() => _errorMessage = 'Verification failed: $error');
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _resendVerification() async {
    final emailError = _validateEmail(_email.text);
    if (emailError != null) {
      setState(() => _errorMessage = emailError);
      return;
    }
    setState(() {
      _resending = true;
      _errorMessage = null;
      _noticeMessage = null;
    });
    try {
      final message = await _authService.resendVerification(_email.text);
      if (mounted) setState(() => _noticeMessage = message);
    } on ApiException catch (error) {
      if (mounted) setState(() => _errorMessage = error.message);
    } catch (error) {
      if (mounted) setState(() => _errorMessage = 'Could not resend the code: $error');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Future<void> _openPolicy(String path) async {
    final uri = Uri.parse('$_websiteBaseUrl/$path');
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        setState(() => _errorMessage = 'Could not open $uri. Open it in your browser.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _errorMessage = 'Could not open $uri: $error');
      }
    }
  }

  Widget _sectionTitle(String title, {String? subtitle}) => Padding(
        padding: const EdgeInsets.only(top: 24, bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: CrymaText.headingMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle, style: CrymaText.bodyMedium),
            ],
          ],
        ),
      );

  Widget _textField({
    required String label,
    required TextEditingController controller,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    bool obscureText = false,
    bool readOnly = false,
    VoidCallback? onTap,
    int maxLines = 1,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextFormField(
          controller: controller,
          validator: validator,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          obscureText: obscureText,
          readOnly: readOnly,
          onTap: onTap,
          maxLines: obscureText ? 1 : maxLines,
          decoration: InputDecoration(labelText: label),
        ),
      );

  Widget _dropdown({
    required String label,
    required List<PsgcEntry> options,
    required PsgcEntry? value,
    required bool enabled,
    required String? Function(PsgcEntry?) validator,
    required ValueChanged<PsgcEntry?> onChanged,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: DropdownButtonFormField<PsgcEntry>(
          key: ValueKey('address-$label-${value?.code ?? ''}-${options.length}'),
          initialValue: value,
          isExpanded: true,
          decoration: InputDecoration(labelText: label),
          items: options
              .map((option) => DropdownMenuItem(
                    value: option,
                    child: Text(option.name, overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
          onChanged: enabled ? onChanged : null,
          validator: validator,
        ),
      );

  Widget _documentField(String field) {
    final file = _documents[field];
    final error = _documentErrors[field];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_documentFields[field]!, style: CrymaText.headingSmall),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  file?.name ?? 'No document selected',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CrymaText.bodyMedium,
                ),
              ),
              if (file != null)
                IconButton(
                  tooltip: 'Remove document',
                  onPressed: () => setState(() {
                    _documents[field] = null;
                    _documentErrors[field] = null;
                  }),
                  icon: const Icon(Icons.close),
                ),
              OutlinedButton(
                onPressed: _submitting ? null : () => _pickDocument(field),
                child: Text(file == null ? 'Choose file' : 'Replace'),
              ),
            ],
          ),
          Text(
            'JPG, JPEG, PNG, or PDF; maximum 5 MB.',
            style: CrymaText.caption,
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                error,
                style: const TextStyle(color: CrymaColors.error, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRegistrationForm() {
    final addressBusy = _loadingRegions ||
        _loadingProvinces ||
        _loadingMunicipalities ||
        _loadingBarangays;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Create your rider account',
            style: CrymaText.headingLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Complete the same identity, address, vehicle, and document requirements used on the CRYMA website.',
            style: CrymaText.bodyMedium,
          ),
          _sectionTitle('Personal information'),
          _textField(
            label: 'First name *',
            controller: _firstName,
            validator: (value) => _validateName(value, 'First name', 30),
          ),
          _textField(
            label: 'Middle initial (optional)',
            controller: _middleName,
            validator: (value) {
              final text = value?.trim() ?? '';
              if (text.length > 2 ||
                  (text.isNotEmpty &&
                      !RegExp(r'^\p{L}\p{M}*\.?$', unicode: true)
                          .hasMatch(text))) {
                return 'Enter one letter with an optional period.';
              }
              return null;
            },
          ),
          _textField(
            label: 'Last name *',
            controller: _lastName,
            validator: (value) => _validateName(value, 'Last name', 30),
          ),
          _textField(
            label: 'Birthday *',
            controller: _birthday,
            readOnly: true,
            onTap: _pickBirthday,
            validator: _validateBirthday,
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: DropdownButtonFormField<String>(
              key: ValueKey('sex-${_sex ?? ''}'),
              initialValue: _sex,
              decoration: const InputDecoration(labelText: 'Sex *'),
              items: const [
                DropdownMenuItem(value: 'male', child: Text('Male')),
                DropdownMenuItem(value: 'female', child: Text('Female')),
                DropdownMenuItem(
                  value: 'prefer_not_to_say',
                  child: Text('Prefer not to say'),
                ),
              ],
              onChanged: (value) => setState(() => _sex = value),
              validator: (value) =>
                  value == null ? 'Choose one of the available options.' : null,
            ),
          ),
          _textField(
            label: 'Mobile number *',
            controller: _phone,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(11),
            ],
            validator: (value) => RegExp(r'^09\d{9}$').hasMatch(value ?? '')
                ? null
                : 'Enter an 11-digit mobile number starting with 09.',
          ),
          _sectionTitle('Philippine address'),
          if (_addressError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _addressError!,
                style: const TextStyle(color: CrymaColors.error),
              ),
            ),
          _dropdown(
            label: 'Region *',
            options: _regions,
            value: _region,
            enabled: !_loadingRegions,
            validator: (value) => value == null ? 'Select a region.' : null,
            onChanged: _selectRegion,
          ),
          if (_provinces.isNotEmpty || _loadingProvinces)
            _dropdown(
              label: 'Province *',
              options: _provinces,
              value: _province,
              enabled: !_loadingProvinces && _provinces.isNotEmpty,
              validator: (value) => _provinces.isNotEmpty && value == null
                  ? 'Select a province.'
                  : null,
              onChanged: _selectProvince,
            ),
          _dropdown(
            label: 'City or municipality *',
            options: _municipalities,
            value: _municipality,
            enabled: !_loadingMunicipalities && _municipalities.isNotEmpty,
            validator: (value) =>
                value == null ? 'Select a city or municipality.' : null,
            onChanged: _selectMunicipality,
          ),
          _dropdown(
            label: 'Barangay *',
            options: _barangays,
            value: _barangay,
            enabled: !_loadingBarangays && _barangays.isNotEmpty,
            validator: (value) => value == null ? 'Select a barangay.' : null,
            onChanged: (value) => setState(() => _barangay = value),
          ),
          _textField(
            label: 'House number *',
            controller: _houseNumber,
            validator: (value) =>
                _requiredText(value, 'House number', maxLength: 20),
          ),
          _textField(
            label: 'Street *',
            controller: _street,
            validator: (value) => _requiredText(value, 'Street', maxLength: 100),
          ),
          _textField(
            label: 'Building (optional)',
            controller: _buildingName,
            validator: (value) {
              if ((value ?? '').runes.length > 80) {
                return 'Building must not exceed 80 characters.';
              }
              return null;
            },
          ),
          _textField(
            label: 'Unit / floor (optional)',
            controller: _unitNumber,
            validator: (value) {
              if ((value ?? '').runes.length > 30) {
                return 'Unit / floor must not exceed 30 characters.';
              }
              return null;
            },
          ),
          _textField(
            label: 'Four-digit postal code *',
            controller: _postalCode,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            validator: (value) => RegExp(r'^\d{4}$').hasMatch(value ?? '')
                ? null
                : 'Enter a valid four-digit postal code.',
          ),
          if (addressBusy)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: LinearProgressIndicator(),
            ),
          _sectionTitle('Rider and vehicle information'),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: DropdownButtonFormField<String>(
              key: ValueKey('vehicle-${_vehicleType ?? ''}'),
              initialValue: _vehicleType,
              decoration: const InputDecoration(labelText: 'Vehicle type *'),
              items: const [
                DropdownMenuItem(value: 'motorcycle', child: Text('Motorcycle')),
                DropdownMenuItem(value: 'tricycle', child: Text('Tricycle')),
                DropdownMenuItem(value: 'car', child: Text('Car')),
                DropdownMenuItem(value: 'van', child: Text('Van')),
                DropdownMenuItem(value: 'truck', child: Text('Truck')),
              ],
              onChanged: (value) => setState(() => _vehicleType = value),
              validator: (value) => value == null || !_vehicleTypes.contains(value)
                  ? 'Choose a supported vehicle type.'
                  : null,
            ),
          ),
          _textField(
            label: 'Plate number *',
            controller: _plateNumber,
            validator: (value) =>
                _requiredText(value, 'Plate number', maxLength: 15),
          ),
          _sectionTitle(
            'Verification documents',
            subtitle: 'All three documents are required for a rider application.',
          ),
          for (final field in _documentFields.keys) _documentField(field),
          _sectionTitle('Account credentials'),
          _textField(
            label: 'Email address *',
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            validator: _validateEmail,
          ),
          _textField(
            label: 'Password *',
            controller: _password,
            obscureText: true,
            validator: _validatePassword,
          ),
          _textField(
            label: 'Confirm password *',
            controller: _passwordConfirmation,
            obscureText: true,
            validator: _validatePasswordConfirmation,
          ),
          _sectionTitle('Terms and privacy'),
          if (_loadingPolicies)
            const LinearProgressIndicator()
          else if (_policies == null)
            TextButton(
              onPressed: _loadPolicies,
              child: const Text('Retry loading the current policy versions'),
            )
          else ...[
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _termsAccepted,
              onChanged: (value) =>
                  setState(() => _termsAccepted = value ?? false),
              title: Text(
                'I have read and agree to the Terms and Conditions '
                '(version ${_policies!.termsVersion}).',
              ),
              subtitle: TextButton(
                onPressed: () => _openPolicy('terms'),
                child: const Text('Read Terms and Conditions'),
              ),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _privacyAcknowledged,
              onChanged: (value) =>
                  setState(() => _privacyAcknowledged = value ?? false),
              title: Text(
                'I acknowledge the Privacy Notice (version '
                '${_policies!.privacyVersion}), including its notice about '
                'identity and verification documents.',
              ),
              subtitle: TextButton(
                onPressed: () => _openPolicy('privacy'),
                child: const Text('Read Privacy Notice'),
              ),
            ),
          ],
          if (_errorMessage != null) _messageBox(_errorMessage!, isError: true),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _submitting ? null : _submitRegistration,
            child: _submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Submit rider application'),
          ),
          TextButton(
            onPressed: _submitting ? null : _openExistingVerification,
            child: const Text('Already registered? Verify your email'),
          ),
          TextButton(
            onPressed: () => context.go('/login'),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    );
  }

  Widget _messageBox(String message, {required bool isError}) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isError ? CrymaColors.errorSurface : CrymaColors.successSurface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message,
          style: TextStyle(
            color: isError ? CrymaColors.error : CrymaColors.success,
          ),
        ),
      );

  Widget _buildVerification() {
    if (_emailVerified) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(
            Icons.verified_outlined,
            size: 64,
            color: CrymaColors.success,
          ),
          const SizedBox(height: 16),
          const Text(
            'Email verified',
            textAlign: TextAlign.center,
            style: CrymaText.headingLarge,
          ),
          const SizedBox(height: 12),
          _messageBox(
            _noticeMessage ??
                'Your rider account is awaiting administrator approval.',
            isError: false,
          ),
          FilledButton(
            onPressed: () => context.go('/login'),
            child: const Text('Go to sign in'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(
          Icons.mark_email_read_outlined,
          size: 60,
          color: CrymaColors.primary,
        ),
        const SizedBox(height: 16),
        const Text(
          'Verify your email',
          textAlign: TextAlign.center,
          style: CrymaText.headingLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Enter the six-digit code for ${_email.text.trim()}.',
          textAlign: TextAlign.center,
          style: CrymaText.bodyLarge,
        ),
        const SizedBox(height: 16),
        _textField(
          label: 'Email address',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          validator: _validateEmail,
        ),
        _textField(
          label: 'Six-digit verification code',
          controller: _otp,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
        ),
        _messageBox(
          'Local development note: this server logs verification emails instead '
          'of delivering them. Check backend/storage/logs/laravel.log for the '
          'latest code.',
          isError: false,
        ),
        if (_noticeMessage != null) _messageBox(_noticeMessage!, isError: false),
        if (_errorMessage != null) _messageBox(_errorMessage!, isError: true),
        FilledButton(
          onPressed: _verifying ? null : _verifyEmail,
          child: _verifying
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Verify email'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: _resending ? null : _resendVerification,
          child: _resending
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Resend verification code'),
        ),
        TextButton(
          onPressed: () => setState(() {
            _showVerification = false;
            _errorMessage = null;
            _noticeMessage = null;
          }),
          child: const Text('Back to registration'),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(_showVerification ? 'Email verification' : 'Rider registration'),
          leading: _showVerification
              ? IconButton(
                  tooltip: 'Back to registration',
                  onPressed: () => setState(() {
                    _showVerification = false;
                    _errorMessage = null;
                    _noticeMessage = null;
                  }),
                  icon: const Icon(Icons.arrow_back),
                )
              : null,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: _showVerification
                    ? _buildVerification()
                    : _buildRegistrationForm(),
              ),
            ),
          ),
        ),
      );
}
