import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../utils/validators.dart';
import '../../widgets/custom_text_field.dart';
import 'terms_screen.dart';
import 'privacy_policy_screen.dart';

// LTO license classifications
const _licenseClasses = ['A', 'A1', 'B', 'B1', 'B2', 'C', 'D', 'BE', 'CE'];

// Vehicle types and whether they require a plate number
const _vehicleTypes = {
  'motorcycle': true,
  'car': true,
  'van': true,
  'truck': true,
  'bicycle': false,
  'e-bike': false,
};

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({Key? key}) : super(key: key);

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  late PageController _pageController;
  int _currentStep = 0;
  static const int _totalSteps = 6;
  File? _licensePhoto;

  // Step 1 – Personal info
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _tinCtrl = TextEditingController();
  bool _showPassword = false;
  bool _showConfirmPassword = false;

  // Step 2 – Vehicle
  String? _vehicleType;
  final _vehicleMakeCtrl = TextEditingController();
  final _vehicleModelCtrl = TextEditingController();
  final _vehicleColorCtrl = TextEditingController();
  final _plateNumberCtrl = TextEditingController();

  // Step 3 – License
  final _licenseNumberCtrl = TextEditingController();
  final _licenseExpiryCtrl = TextEditingController();
  String? _licenseClassification;
  final _licenseRestrictionsCtrl = TextEditingController();

  // Step 4 – Address (managed by AddressProvider)
  final _houseNumberCtrl = TextEditingController();
  final _streetNameCtrl = TextEditingController();
  final _additionalAddressCtrl = TextEditingController();
  final _manualBarangayCtrl = TextEditingController();

  // Step 6 – Consent
  bool _agreedToTerms = false;
  bool _acknowledgedPrivacy = false;
  DateTime? _termsAcceptedAt;
  DateTime? _privacyAcknowledgedAt;

  bool get _plateRequired => _vehicleTypes[_vehicleType] ?? true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AddressProvider>().fetchRegions();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    for (final c in [
      _firstNameCtrl, _lastNameCtrl, _emailCtrl, _passwordCtrl,
      _confirmPasswordCtrl, _phoneCtrl, _tinCtrl,
      _vehicleMakeCtrl, _vehicleModelCtrl, _vehicleColorCtrl, _plateNumberCtrl,
      _licenseNumberCtrl, _licenseExpiryCtrl, _licenseRestrictionsCtrl,
      _houseNumberCtrl, _streetNameCtrl, _additionalAddressCtrl,
      _manualBarangayCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _goTo(int step) {
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _pickLicensePhoto() async {
    final picker = ImagePicker();
    final messenger = ScaffoldMessenger.of(context);
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Choose Photo Source'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, ImageSource.camera),
            child: const Text('Camera'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
            child: const Text('Gallery'),
          ),
        ],
      ),
    );
    if (source == null) return;

    final picked = await picker.pickImage(source: source);
    if (picked == null) return;

    final file = File(picked.path);
    final sizeError = Validators.validateFileSize(await file.length());
    if (!mounted) return;
    if (sizeError != null) {
      messenger.showSnackBar(SnackBar(content: Text(sizeError)));
      return;
    }
    setState(() => _licensePhoto = file);
  }

  Future<void> _selectExpiryDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 365)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 36500)),
    );
    if (date != null) {
      _licenseExpiryCtrl.text =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    }
  }

  String? _validateStep(int step) {
    switch (step) {
      case 0:
        if (Validators.validateName(_firstNameCtrl.text) != null) {
          return 'First name is required and must be valid';
        }
        if (Validators.validateName(_lastNameCtrl.text) != null) {
          return 'Last name is required and must be valid';
        }
        if (Validators.validateEmail(_emailCtrl.text) != null) {
          return 'A valid email is required';
        }
        if (Validators.validatePassword(_passwordCtrl.text) != null) {
          return 'Password must be 8+ chars with uppercase, lowercase, and number';
        }
        if (Validators.validatePasswordConfirm(
                _confirmPasswordCtrl.text, _passwordCtrl.text) !=
            null) {
          return 'Passwords do not match';
        }
        if (Validators.validatePhone(_phoneCtrl.text) != null) {
          return 'A valid Philippine mobile number is required';
        }
        if (Validators.validateTIN(_tinCtrl.text) != null) {
          return 'TIN must be exactly 9 digits';
        }
        return null;

      case 1:
        if (_vehicleType == null) return 'Vehicle type is required';
        if (_vehicleMakeCtrl.text.trim().isEmpty) return 'Vehicle make is required';
        if (_vehicleModelCtrl.text.trim().isEmpty) return 'Vehicle model is required';
        if (_vehicleColorCtrl.text.trim().isEmpty) return 'Vehicle color is required';
        if (_plateRequired &&
            Validators.validatePlateNumber(_plateNumberCtrl.text) != null) {
          return 'Plate number is required and must be valid';
        }
        return null;

      case 2:
        if (Validators.validateLicenseNumber(_licenseNumberCtrl.text) != null) {
          return 'License number is required and must be valid';
        }
        if (Validators.validateLicenseExpiry(_licenseExpiryCtrl.text) != null) {
          return 'A valid future license expiry date is required';
        }
        if (_licenseClassification == null) {
          return 'License classification is required';
        }
        return null;

      case 3:
        final ap = context.read<AddressProvider>();
        if (ap.selectedRegion == null) return 'Region is required';
        if (ap.selectedProvince == null) return 'Province is required';
        if (ap.selectedMunicipality == null) return 'Municipality is required';
        // Barangay: either dropdown or manual
        if (ap.barangays.isNotEmpty && ap.selectedBarangay == null) {
          return 'Barangay is required';
        }
        if (ap.barangays.isEmpty && _manualBarangayCtrl.text.trim().isEmpty) {
          return 'Barangay is required';
        }
        if (_houseNumberCtrl.text.trim().isEmpty) return 'House number is required';
        if (_streetNameCtrl.text.trim().isEmpty) return 'Street name is required';
        return null;

      case 4:
        if (_licensePhoto == null) return 'License photo is required';
        return null;

      case 5:
        if (!_agreedToTerms) return 'You must accept the Terms and Conditions';
        if (!_acknowledgedPrivacy) return 'You must acknowledge the Privacy Policy';
        return null;
    }
    return null;
  }

  void _nextStep() {
    final error = _validateStep(_currentStep);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
      return;
    }
    if (_currentStep < _totalSteps - 1) _goTo(_currentStep + 1);
  }

  void _previousStep() {
    if (_currentStep > 0) _goTo(_currentStep - 1);
  }

  Future<void> _submitRegistration() async {
    final error = _validateStep(5);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: const Color(0xFFE74C3C)),
      );
      return;
    }

    final ap = context.read<AddressProvider>();
    final barangayName = ap.barangays.isNotEmpty
        ? (ap.selectedBarangay?.name ?? '')
        : _manualBarangayCtrl.text.trim();
    final barangayCode = ap.selectedBarangay?.code ?? '';

    final formData = <String, String>{
      'firstName': _firstNameCtrl.text.trim(),
      'lastName': _lastNameCtrl.text.trim(),
      'email': _emailCtrl.text.trim().toLowerCase(),
      'password': _passwordCtrl.text,
      'phone': Validators.normalizePhone(_phoneCtrl.text) ?? '',
      'tin': _tinCtrl.text.trim(),
      'vehicleType': _vehicleType ?? '',
      'vehicleMake': _vehicleMakeCtrl.text.trim(),
      'vehicleModel': _vehicleModelCtrl.text.trim(),
      'vehicleColor': _vehicleColorCtrl.text.trim(),
      'plateNumber': _plateRequired ? _plateNumberCtrl.text.trim() : '',
      'licenseNumber': _licenseNumberCtrl.text.trim(),
      'licenseExpiry': _licenseExpiryCtrl.text.trim(),
      'licenseClassification': _licenseClassification ?? '',
      'licenseRestrictions': _licenseRestrictionsCtrl.text.trim(),
      'regionCode': ap.selectedRegion?.code ?? '',
      'region': ap.selectedRegion?.name ?? '',
      'provinceCode': ap.selectedProvince?.code ?? '',
      'province': ap.selectedProvince?.name ?? '',
      'municipalityCode': ap.selectedMunicipality?.code ?? '',
      'municipality': ap.selectedMunicipality?.name ?? '',
      'barangayCode': barangayCode,
      'barangay': barangayName,
      'houseNumber': _houseNumberCtrl.text.trim(),
      'streetName': _streetNameCtrl.text.trim(),
      'additionalAddress': _additionalAddressCtrl.text.trim(),
      'termsAcceptedAt': _termsAcceptedAt?.toIso8601String() ?? '',
      'privacyAcknowledgedAt': _privacyAcknowledgedAt?.toIso8601String() ?? '',
    };

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.registerRider(
      formData,
      licensePhotoPath: _licensePhoto?.path,
    );

    if (!mounted) return;

    if (success) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          title: const Text('Registration Submitted'),
          content: const Text(
            'Your application is pending admin approval. You will be notified once reviewed.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/login');
              },
              child: const Text('Go to Login'),
            ),
          ],
        ),
      );
    } else if (authProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage!),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Register — Step ${_currentStep + 1} of $_totalSteps'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(
            value: (_currentStep + 1) / _totalSteps,
            backgroundColor: Colors.grey.shade200,
            color: Theme.of(context).colorScheme.primary,
          ),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _currentStep = i),
              children: [
                _buildStep1PersonalInfo(),
                _buildStep2VehicleInfo(),
                _buildStep3LicenseInfo(),
                _buildStep4Address(),
                _buildStep5LicensePhoto(),
                _buildStep6Consent(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavRow({bool isLast = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (_currentStep > 0)
          OutlinedButton(
            onPressed: _previousStep,
            child: const Text('Back'),
          )
        else
          const SizedBox.shrink(),
        if (!isLast)
          ElevatedButton(
            onPressed: _nextStep,
            child: const Text('Next'),
          )
        else
          Consumer<AuthProvider>(
            builder: (_, ap, __) => ElevatedButton(
              onPressed: ap.isLoading ? null : _submitRegistration,
              child: ap.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Submit'),
            ),
          ),
      ],
    );
  }

  Widget _buildStep1PersonalInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Personal Information',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          CustomTextField(
            label: 'First Name',
            controller: _firstNameCtrl,
            validator: Validators.validateName,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Last Name',
            controller: _lastNameCtrl,
            validator: Validators.validateName,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Email',
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            validator: Validators.validateEmail,
            maxLength: 100,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Password',
            controller: _passwordCtrl,
            obscureText: !_showPassword,
            validator: Validators.validatePassword,
            maxLength: 128,
            suffixIcon: IconButton(
              icon: Icon(
                  _showPassword ? Icons.visibility : Icons.visibility_off),
              onPressed: () =>
                  setState(() => _showPassword = !_showPassword),
            ),
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Confirm Password',
            controller: _confirmPasswordCtrl,
            obscureText: !_showConfirmPassword,
            validator: (v) =>
                Validators.validatePasswordConfirm(v, _passwordCtrl.text),
            maxLength: 128,
            suffixIcon: IconButton(
              icon: Icon(_showConfirmPassword
                  ? Icons.visibility
                  : Icons.visibility_off),
              onPressed: () => setState(
                  () => _showConfirmPassword = !_showConfirmPassword),
            ),
          ),
          const SizedBox(height: 16),
          // Phone with +63 prefix display
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            maxLength: 10,
            decoration: const InputDecoration(
              labelText: 'Mobile Number',
              prefixText: '+63 ',
              hintText: '9XXXXXXXXX',
              counterText: '',
            ),
            validator: (v) {
              final full = '+63${v ?? ''}';
              return Validators.validatePhone(full);
            },
          ),
          const SizedBox(height: 4),
          const Text(
            'Enter 10 digits starting with 9 (e.g. 9171234567)',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'TIN (9 digits)',
            controller: _tinCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: Validators.validateTIN,
            maxLength: 9,
            hint: '123456789',
          ),
          const SizedBox(height: 4),
          const Text(
            'Your TIN is stored securely and masked in account displays.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 32),
          _buildNavRow(),
        ],
      ),
    );
  }

  Widget _buildStep2VehicleInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Vehicle Information',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          DropdownButtonFormField<String>(
            initialValue: _vehicleType,
            decoration: const InputDecoration(labelText: 'Vehicle Type'),
            items: _vehicleTypes.keys
                .map((t) => DropdownMenuItem(
                      value: t,
                      child: Text(
                          t[0].toUpperCase() + t.substring(1)),
                    ))
                .toList(),
            onChanged: (v) => setState(() {
              _vehicleType = v;
              if (v != null && !(_vehicleTypes[v] ?? true)) {
                _plateNumberCtrl.clear();
              }
            }),
            validator: (v) => v == null ? 'Vehicle type is required' : null,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Make (e.g. Honda, Toyota)',
            controller: _vehicleMakeCtrl,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Model (e.g. Click 125i)',
            controller: _vehicleModelCtrl,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Color',
            controller: _vehicleColorCtrl,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          if (_plateRequired) ...[
            CustomTextField(
              label: 'Plate Number',
              controller: _plateNumberCtrl,
              validator: Validators.validatePlateNumber,
              maxLength: 20,
              hint: 'e.g. ABC 1234',
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: const Text(
                'Plate number not required for this vehicle type.',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ),
          ],
          const SizedBox(height: 32),
          _buildNavRow(),
        ],
      ),
    );
  }

  Widget _buildStep3LicenseInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Driver's License",
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          CustomTextField(
            label: "License Number (e.g. N01-23-456789)",
            controller: _licenseNumberCtrl,
            validator: Validators.validateLicenseNumber,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _licenseExpiryCtrl,
            readOnly: true,
            onTap: _selectExpiryDate,
            validator: Validators.validateLicenseExpiry,
            decoration: const InputDecoration(
              labelText: 'License Expiry Date',
              suffixIcon: Icon(Icons.calendar_today),
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _licenseClassification,
            decoration: const InputDecoration(
                labelText: 'License Classification (LTO)'),
            items: _licenseClasses
                .map((c) =>
                    DropdownMenuItem(value: c, child: Text('Class $c')))
                .toList(),
            onChanged: (v) => setState(() => _licenseClassification = v),
            validator: (v) =>
                v == null ? 'License classification is required' : null,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Restrictions / Conditions (Optional)',
            controller: _licenseRestrictionsCtrl,
            maxLength: 255,
            maxLines: 2,
            hint: 'e.g. Restriction 1, 2',
          ),
          const SizedBox(height: 32),
          _buildNavRow(),
        ],
      ),
    );
  }

  Widget _buildStep4Address() {
    final ap = context.watch<AddressProvider>();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Address', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          if (ap.errorMessage != null)
            Container(
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(ap.errorMessage!,
                        style: const TextStyle(fontSize: 13)),
                  ),
                  TextButton(
                    onPressed: () => ap.fetchRegions(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          // Region
          DropdownButtonFormField<String>(
            initialValue: ap.selectedRegion?.code,
            decoration: InputDecoration(
              labelText: 'Region',
              suffixIcon: ap.regionsLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : null,
            ),
            items: ap.regions
                .map((r) =>
                    DropdownMenuItem(value: r.code, child: Text(r.name)))
                .toList(),
            onChanged: ap.regionsLoading
                ? null
                : (v) {
                    if (v != null) ap.selectRegion(v);
                  },
            validator: (v) => v == null ? 'Region is required' : null,
          ),
          const SizedBox(height: 16),
          // Province
          DropdownButtonFormField<String>(
            initialValue: ap.selectedProvince?.code,
            decoration: InputDecoration(
              labelText: 'Province',
              suffixIcon: ap.provincesLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : null,
            ),
            items: ap.provinces
                .map((p) =>
                    DropdownMenuItem(value: p.code, child: Text(p.name)))
                .toList(),
            onChanged: (ap.selectedRegion == null || ap.provincesLoading)
                ? null
                : (v) {
                    if (v != null) ap.selectProvince(v);
                  },
            validator: (v) => v == null ? 'Province is required' : null,
          ),
          const SizedBox(height: 16),
          // Municipality
          DropdownButtonFormField<String>(
            initialValue: ap.selectedMunicipality?.code,
            decoration: InputDecoration(
              labelText: 'City / Municipality',
              suffixIcon: ap.municipalitiesLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : null,
            ),
            items: ap.municipalities
                .map((m) =>
                    DropdownMenuItem(value: m.code, child: Text(m.name)))
                .toList(),
            onChanged: (ap.selectedProvince == null || ap.municipalitiesLoading)
                ? null
                : (v) {
                    if (v != null) ap.selectMunicipality(v);
                  },
            validator: (v) => v == null ? 'Municipality is required' : null,
          ),
          const SizedBox(height: 16),
          // Barangay — dropdown if available, manual text if not
          if (ap.barangays.isNotEmpty || ap.barangaysLoading) ...[
            DropdownButtonFormField<String>(
              initialValue: ap.selectedBarangay?.code,
              decoration: InputDecoration(
                labelText: 'Barangay',
                suffixIcon: ap.barangaysLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
              ),
              items: ap.barangays
                  .map((b) =>
                      DropdownMenuItem(value: b.code, child: Text(b.name)))
                  .toList(),
              onChanged:
                  (ap.selectedMunicipality == null || ap.barangaysLoading)
                      ? null
                      : (v) {
                          if (v != null) ap.selectBarangay(v);
                        },
              validator: (v) => v == null ? 'Barangay is required' : null,
            ),
          ] else if (ap.selectedMunicipality != null) ...[
            CustomTextField(
              label: 'Barangay (enter manually)',
              controller: _manualBarangayCtrl,
              maxLength: 100,
              hint: 'Barangay name',
            ),
            const SizedBox(height: 4),
            const Text(
              'Barangay data unavailable for this municipality. Please enter manually.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
          const SizedBox(height: 16),
          CustomTextField(
            label: 'House / Unit Number',
            controller: _houseNumberCtrl,
            maxLength: 50,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Street',
            controller: _streetNameCtrl,
            maxLength: 100,
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Subdivision / Sitio / Purok (Optional)',
            controller: _additionalAddressCtrl,
            maxLength: 255,
            maxLines: 2,
          ),
          const SizedBox(height: 32),
          _buildNavRow(),
        ],
      ),
    );
  }

  Widget _buildStep5LicensePhoto() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("License Photo",
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Upload a clear photo of your driver\'s license. JPG or PNG, max 5 MB.',
            style: TextStyle(fontSize: 13, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _pickLicensePhoto,
            child: Container(
              height: 280,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _licensePhoto != null
                      ? Theme.of(context).colorScheme.primary
                      : Colors.grey.shade400,
                  width: 2,
                ),
                color: Colors.grey.shade50,
              ),
              child: _licensePhoto != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.file(_licensePhoto!, fit: BoxFit.cover),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo,
                            size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text('Tap to upload photo',
                            style: TextStyle(color: Colors.grey)),
                      ],
                    ),
            ),
          ),
          if (_licensePhoto != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickLicensePhoto,
                    icon: const Icon(Icons.edit),
                    label: const Text('Change'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() => _licensePhoto = null),
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text('Remove',
                        style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red)),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 32),
          _buildNavRow(),
        ],
      ),
    );
  }

  Widget _buildStep6Consent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Review & Consent',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Please read and accept both documents before submitting.',
            style: TextStyle(fontSize: 13, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          // Summary card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _reviewRow('Name',
                      '${_firstNameCtrl.text} ${_lastNameCtrl.text}'),
                  _reviewRow('Email', _emailCtrl.text),
                  _reviewRow('Phone', '+63${_phoneCtrl.text}'),
                  const Divider(),
                  _reviewRow('Vehicle',
                      '${_vehicleType ?? ''} — ${_vehicleMakeCtrl.text} ${_vehicleModelCtrl.text}'),
                  if (_plateRequired)
                    _reviewRow('Plate', _plateNumberCtrl.text),
                  const Divider(),
                  _reviewRow('License', _licenseNumberCtrl.text),
                  _reviewRow('Expiry', _licenseExpiryCtrl.text),
                  _reviewRow('Class', _licenseClassification ?? ''),
                  const Divider(),
                  _reviewRow(
                    'Address',
                    [
                      _houseNumberCtrl.text,
                      _streetNameCtrl.text,
                      context.read<AddressProvider>().selectedBarangay?.name ??
                          _manualBarangayCtrl.text,
                      context
                              .read<AddressProvider>()
                              .selectedMunicipality
                              ?.name ??
                          '',
                    ].where((s) => s.isNotEmpty).join(', '),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Terms
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: _agreedToTerms
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade300,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: Icon(
                    _agreedToTerms
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    color: _agreedToTerms
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey,
                  ),
                  title: const Text('Terms and Conditions',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    _agreedToTerms
                        ? 'Accepted'
                        : 'Required — tap to read and accept',
                    style: TextStyle(
                      fontSize: 12,
                      color: _agreedToTerms ? Colors.green : Colors.grey,
                    ),
                  ),
                  trailing: TextButton(
                    onPressed: () async {
                      final accepted = await Navigator.push<bool>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const TermsAndConditionsScreen(
                              requireAcceptance: true),
                        ),
                      );
                      if (accepted == true) {
                        setState(() {
                          _agreedToTerms = true;
                          _termsAcceptedAt = DateTime.now();
                        });
                      }
                    },
                    child: const Text('Read'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Privacy
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: _acknowledgedPrivacy
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade300,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: Icon(
                    _acknowledgedPrivacy
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    color: _acknowledgedPrivacy
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey,
                  ),
                  title: const Text('Privacy Policy',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    _acknowledgedPrivacy
                        ? 'Acknowledged'
                        : 'Required — tap to read and acknowledge',
                    style: TextStyle(
                      fontSize: 12,
                      color:
                          _acknowledgedPrivacy ? Colors.green : Colors.grey,
                    ),
                  ),
                  trailing: TextButton(
                    onPressed: () async {
                      final acked = await Navigator.push<bool>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const PrivacyPolicyScreen(
                              requireAcknowledgment: true),
                        ),
                      );
                      if (acked == true) {
                        setState(() {
                          _acknowledgedPrivacy = true;
                          _privacyAcknowledgedAt = DateTime.now();
                        });
                      }
                    },
                    child: const Text('Read'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildNavRow(isLast: true),
        ],
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
