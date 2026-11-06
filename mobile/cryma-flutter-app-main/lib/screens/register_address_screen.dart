import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

// ============================================================
// 📍 MOCK DATA - PHILIPPINES (walang binago)
// ============================================================
class AddressData {
  static final List<String> provinces = [
    'Laguna',
    'Metro Manila',
    'Cebu',
    'Davao',
    'Pampanga',
    'Batangas',
    'Cavite',
    'Rizal',
    'Bulacan',
  ];

  static final Map<String, List<String>> municipalities = {
    'Laguna': [
      'Santa Cruz',
      'Calamba',
      'San Pablo',
      'Santa Rosa',
      'Biñan',
      'Cabuyao',
      'San Pedro',
      'Luisiana',
      'Lumban',
      'Mabitac',
      'Magdalena',
      'Majayjay',
      'Nagcarlan',
      'Paete',
      'Pagsanjan',
      'Pakil',
      'Pangil',
      'Pila',
      'Rizal',
      'San Juan',
      'Siniloan',
      'Victoria',
    ],
    'Metro Manila': [
      'Manila',
      'Quezon City',
      'Makati',
      'Pasig',
      'Taguig',
      'Mandaluyong',
      'Marikina',
      'Pasay',
      'Parañaque',
      'Las Piñas',
      'Muntinlupa',
      'Valenzuela',
      'Caloocan',
      'Malabon',
      'Navotas',
      'San Juan',
      'Pateros',
    ],
    'Cebu': [
      'Cebu City',
      'Mandaue',
      'Lapu-Lapu',
      'Talisay',
      'Consolacion',
      'Liloan',
      'Compostela',
      'Danao',
      'Toledo',
      'Naga',
    ],
    'Davao': [
      'Davao City',
      'Digos',
      'Tagum',
      'Panabo',
      'Samal',
      'Mati',
      'Santa Cruz',
    ],
    'Pampanga': [
      'Angeles City',
      'San Fernando',
      'Mabalacat',
      'Mexico',
      'Arayat',
      'Candaba',
      'Floridablanca',
      'Guagua',
      'Lubao',
      'Porac',
      'San Luis',
      'Santa Rita',
      'Sasmuan',
    ],
    'Batangas': [
      'Batangas City',
      'Lipa',
      'Tanauan',
      'Santo Tomas',
      'San Jose',
      'Rosario',
      'Balayan',
      'Calaca',
      'Nasugbu',
      'Taal',
      'Lemery',
      'Cuenca',
    ],
    'Cavite': [
      'Dasmariñas',
      'Bacoor',
      'Imus',
      'General Trias',
      'Silang',
      'Trece Martires',
      'Tagaytay',
      'Naic',
      'Tanza',
      'Maragondon',
    ],
    'Rizal': [
      'Antipolo',
      'Cainta',
      'Taytay',
      'Binangonan',
      'San Mateo',
      'Rodriguez',
      'Tanay',
      'Angono',
      'Cardona',
      'Morong',
      'Baras',
      'Jala-Jala',
      'Pililla',
      'Teresa',
    ],
    'Bulacan': [
      'Malolos',
      'Meycauayan',
      'San Jose del Monte',
      'Santa Maria',
      'Bocaue',
      'Marilao',
      'Balagtas',
      'Guiguinto',
      'Pulilan',
      'Plaridel',
      'Baliuag',
      'San Rafael',
      'Norzagaray',
      'Angat',
    ],
  };

  static final Map<String, List<String>> barangays = {
    'Santa Cruz': [
      'Poblacion I',
      'Poblacion II',
      'Poblacion III',
      'Poblacion IV',
      'Poblacion V',
      'Santisima',
      'Bagumbayan',
      'Bubukal',
      'Calios',
      'Duhat',
      'Gatid',
      'Halang',
      'Kabulusan',
      'Labuin',
      'Lalab',
      'Lumban',
      'Malinao',
      'Manila',
      'Masiit',
      'Palina',
      'San Juan',
      'San Lorenzo',
      'San Pablo',
      'San Pedro',
      'Santa Ana',
      'Santa Isabel',
      'Santa Rosa',
      'Santo Domingo',
      'Santo Tomas',
      'Silangan',
      'Taytay',
      'Zaballero',
    ],
    'Calamba': [
      'Barandal',
      'Canlubang',
      'Makiling',
      'Pansol',
      'Real',
      'Sucol',
      'Bagong Kalsada',
      'Bambang',
      'Bubuyan',
      'Halang',
      'Lawa',
      'Lingga',
      'Looc',
      'Paciano Rizal',
      'Palingon',
      'Parian',
      'San Cristobal',
      'San Jose',
      'San Juan',
      'San Pedro',
      'Santa Cruz',
      'Santa Elena',
      'Santa Isabel',
      'Santo Domingo',
      'Santo Tomas',
      'Turbina',
    ],
    'San Pablo': [
      'Bayan',
      'San Jose',
      'San Miguel',
      'Santa Ana',
      'Santa Catalina',
      'Santa Clara',
      'Santa Elena',
      'Santa Isabel',
      'Santa Maria',
      'Santa Rita',
      'Santo Cristo',
      'Santo Domingo',
      'Santo Niño',
      'Santiago',
      'San Antonio',
      'San Buenaventura',
      'San Francisco',
      'San Gabriel',
      'San Gregorio',
      'San Ildefonso',
      'San Isidro',
      'San Juan',
      'San Lorenzo',
      'San Luis',
      'San Mateo',
      'San Nicolas',
      'San Pascual',
      'San Pedro',
      'San Rafael',
      'San Roque',
      'San Vicente',
    ],
    'Santa Rosa': [
      'Tagapo',
      'Dita',
      'Malusak',
      'Balibago',
      'Don Jose',
      'Macabling',
      'Pulong Santa Cruz',
      'Santa Elena',
      'Aplaya',
      'Caingin',
      'Poblacion',
      'Labas',
      'Lagusnilad',
      'Malitlit',
      'Manila',
      'Santa Rosa',
      'Santo Domingo',
      'Santo Tomas',
      'Sinalhan',
      'Talong',
    ],
    'Biñan': [
      'Poblacion',
      'San Antonio',
      'San Francisco',
      'San Jose',
      'San Juan',
      'San Lorenzo',
      'San Mateo',
      'San Miguel',
      'San Nicolas',
      'San Pedro',
      'San Ramon',
      'San Vicente',
      'Santiago',
      'Santo Domingo',
      'Santo Niño',
      'Santo Tomas',
      'Timbao',
      'Zaballero',
    ],
    'Cabuyao': [
      'Poblacion',
      'Baclaran',
      'Bigaa',
      'Butong',
      'Casile',
      'Diezmo',
      'Gulod',
      'Mamatid',
      'Marinig',
      'Niugan',
      'Pulo',
      'Putol',
      'Sala',
      'San Isidro',
      'San Jose',
      'San Miguel',
      'San Nicolas',
      'Santa Ana',
      'Santa Cruz',
      'Santa Elena',
      'Santa Isabel',
      'Santa Maria',
      'Santo Domingo',
      'Santo Tomas',
      'Tulo',
    ],
  };
}

// ============================================================
// REGISTER ADDRESS SCREEN
// ============================================================
class RegisterAddressScreen extends StatefulWidget {
  const RegisterAddressScreen({
    super.key,
    this.personalData,
    this.contactData,
  });

  final Map<String, dynamic>? personalData;
  final Map<String, dynamic>? contactData;

  @override
  State<RegisterAddressScreen> createState() => _RegisterAddressScreenState();
}

class _RegisterAddressScreenState extends State<RegisterAddressScreen> {
  static const _psgcRoot = 'https://psgc.cloud/api/v2';
  List<Map<String, dynamic>> _regions = [];
  List<Map<String, dynamic>> _provinces = [];
  List<Map<String, dynamic>> _cities = [];
  List<Map<String, dynamic>> _barangayRows = [];
  String _regionCode = '';
  String _provinceCode = '';
  String _cityCode = '';
  String _selectedRegion = '';
  String _selectedProvince = '';
  String _selectedMunicipality = '';
  String _selectedBarangay = '';

  final TextEditingController _houseNumberController = TextEditingController();
  final TextEditingController _streetController = TextEditingController();
  final TextEditingController _buildingNameController = TextEditingController();
  final TextEditingController _unitNumberController = TextEditingController();
  final TextEditingController _postalCodeController = TextEditingController();

  final _formKey = GlobalKey<FormState>(); // ✅ NEW

  bool _showProvince = false;
  bool _showRegion = false;
  bool _showMunicipality = false;
  bool _showBarangay = false;
  bool _attemptedContinue = false;

  @override
  void initState() {
    super.initState();
    BuyerRegistrationErrorStore.instance.addListener(_onServerErrorsChanged);
    _loadRegions();
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    _houseNumberController.dispose();
    _streetController.dispose();
    _buildingNameController.dispose();
    _unitNumberController.dispose();
    _postalCodeController.dispose();
    super.dispose();
  }

  void _onServerErrorsChanged() {
    if (!mounted) return;
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _formKey.currentState?.validate();
    });
  }

  String? _serverError(String field) =>
      BuyerRegistrationErrorStore.instance.errorFor(field);

  Widget _fieldError(String? message) {
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 5),
      child: Text(
        message,
        style: const TextStyle(
          color: AppColors.danger,
          fontSize: 11,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  List<String> _getMunicipalities() {
    return _cities.map((row) => row['name'].toString()).toList();
  }

  List<String> _getBarangays() {
    return _barangayRows.map((row) => row['name'].toString()).toList();
  }

  Future<List<Map<String, dynamic>>> _fetchOptions(String path) async {
    final response = await http.get(Uri.parse('$_psgcRoot/$path'),
        headers: const {
          'Accept': 'application/json'
        }).timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const FormatException(
          'Philippine address options are unavailable. Please try again.');
    }
    final decoded = jsonDecode(response.body);
    final data = decoded is Map<String, dynamic> ? decoded['data'] : decoded;
    if (data is! List) {
      throw const FormatException(
          'The location service returned an invalid response.');
    }
    return data.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> _loadRegions() async {
    try {
      final rows = await _fetchOptions('regions');
      if (mounted) setState(() => _regions = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    }
  }

  Future<void> _selectRegion(String value) async {
    final row = _regions.firstWhere((item) => item['name'] == value,
        orElse: () => const {});
    final code = row['code']?.toString() ?? '';
    setState(() {
      _attemptedContinue = false;
      _selectedRegion = value;
      _showRegion = false;
      _showProvince = false;
      _showMunicipality = false;
      _showBarangay = false;
      _regionCode = code;
      _selectedProvince = '';
      _selectedMunicipality = '';
      _selectedBarangay = '';
      _provinces = [];
      _cities = [];
      _barangayRows = [];
    });
    BuyerRegistrationErrorStore.instance.clearField('region');
    try {
      final rows = await _fetchOptions('regions/$code/provinces');
      if (mounted && code == _regionCode) setState(() => _provinces = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    }
  }

  Future<void> _selectProvince(String value) async {
    final row = _provinces.firstWhere((item) => item['name'] == value,
        orElse: () => const {});
    final code = row['code']?.toString() ?? '';
    setState(() {
      _selectedProvince = value;
      _provinceCode = code;
      _selectedMunicipality = '';
      _selectedBarangay = '';
      _cities = [];
      _barangayRows = [];
    });
    BuyerRegistrationErrorStore.instance.clearField('province');
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$code/cities-municipalities');
      if (mounted && code == _provinceCode) setState(() => _cities = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    }
  }

  Future<void> _selectMunicipality(String value) async {
    final row = _cities.firstWhere((item) => item['name'] == value,
        orElse: () => const {});
    final code = row['code']?.toString() ?? '';
    setState(() {
      _selectedMunicipality = value;
      _cityCode = code;
      _selectedBarangay = '';
      _barangayRows = [];
    });
    BuyerRegistrationErrorStore.instance.clearField('municipality');
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$_provinceCode/cities-municipalities/$code/barangays');
      if (mounted && code == _cityCode) setState(() => _barangayRows = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    }
  }

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
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
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'OK',
              style: TextStyle(
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleContinue() {
    setState(() => _attemptedContinue = true);
    // Validate location selections before checking the text fields.
    if (_selectedProvince.isEmpty ||
        _selectedMunicipality.isEmpty ||
        _selectedBarangay.isEmpty ||
        _selectedRegion.isEmpty) {
      setState(() {});
      return;
    }

    final isFormValid = _formKey.currentState?.validate() ?? false;
    if (!isFormValid) {
      return;
    }

    final addressData = {
      'province': _selectedProvince,
      'region': _selectedRegion,
      'municipality': _selectedMunicipality,
      'barangay': _selectedBarangay,
      'houseNumber': _houseNumberController.text.trim(),
      'street': _streetController.text.trim(),
      'buildingName': _buildingNameController.text.trim(),
      'unitNumber': _unitNumberController.text.trim(),
      'postalCode': _postalCodeController.text.trim(),
    };

    Navigator.pushNamed(
      context,
      '/register_account',
      arguments: {
        'personalData': widget.personalData ?? {},
        'contactData': widget.contactData ?? {},
        'addressData': addressData,
      },
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
                _buildStepper(currentStep: 2),
                const SizedBox(height: 14),

                // INTRO
                const Text(
                  'Where are you located?',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 18),

                // LOCATION SECTION
                _buildSectionTitle('LOCATION'),
                const SizedBox(height: 6),

                _buildLabel('REGION *'),
                const SizedBox(height: 4),
                _buildDropdown(
                  value: _selectedRegion,
                  hint: _regions.isEmpty ? 'Loading regions…' : 'Select region',
                  isOpen: _showRegion,
                  items: _regions.map((row) => row['name'].toString()).toList(),
                  isDisabled: _regions.isEmpty,
                  onToggle: () => setState(() {
                    _showRegion = !_showRegion;
                    _showProvince = false;
                    _showMunicipality = false;
                    _showBarangay = false;
                  }),
                  onSelect: _selectRegion,
                ),
                _fieldError(_serverError('region') ??
                    (_attemptedContinue && _selectedRegion.isEmpty
                        ? 'Select a region.'
                        : null)),
                const SizedBox(height: 10),

                // PROVINCE
                _buildLabel('PROVINCE *'),
                const SizedBox(height: 4),
                _buildDropdown(
                  value: _selectedProvince,
                  hint: 'Select province',
                  isOpen: _showProvince,
                  items:
                      _provinces.map((row) => row['name'].toString()).toList(),
                  isDisabled: _selectedRegion.isEmpty,
                  onToggle: () {
                    setState(() {
                      _showProvince = !_showProvince;
                      _showMunicipality = false;
                      _showBarangay = false;
                    });
                  },
                  onSelect: (value) {
                    setState(() {
                      _showProvince = false;
                      _showMunicipality = false;
                      _showBarangay = false;
                    });
                    _selectProvince(value);
                  },
                ),
                _fieldError(_serverError('province') ??
                    (_attemptedContinue && _selectedProvince.isEmpty
                        ? 'Select a province.'
                        : null)),
                const SizedBox(height: 10),

                // MUNICIPALITY
                _buildLabel('MUNICIPALITY / CITY *'),
                const SizedBox(height: 4),
                _buildDropdown(
                  value: _selectedMunicipality,
                  hint: 'Select municipality',
                  isOpen: _showMunicipality,
                  items: _getMunicipalities(),
                  isDisabled: _selectedProvince.isEmpty,
                  onToggle: () {
                    if (_selectedProvince.isEmpty || _cities.isEmpty) {
                      _showAlert(
                          'Please select a province and wait for its cities to load.');
                    } else {
                      setState(() {
                        _showMunicipality = !_showMunicipality;
                        _showProvince = false;
                        _showBarangay = false;
                      });
                    }
                  },
                  onSelect: (value) {
                    setState(() {
                      _showMunicipality = false;
                      _showBarangay = false;
                    });
                    _selectMunicipality(value);
                  },
                ),
                _fieldError(_serverError('municipality') ??
                    (_attemptedContinue && _selectedMunicipality.isEmpty
                        ? 'Select a city or municipality.'
                        : null)),
                const SizedBox(height: 10),

                // BARANGAY
                _buildLabel('BARANGAY *'),
                const SizedBox(height: 4),
                _buildDropdown(
                  value: _selectedBarangay,
                  hint: 'Select barangay',
                  isOpen: _showBarangay,
                  items: _getBarangays(),
                  isDisabled: _selectedMunicipality.isEmpty,
                  onToggle: () {
                    if (_selectedMunicipality.isEmpty ||
                        _barangayRows.isEmpty) {
                      _showAlert('Please select a municipality first.');
                    } else {
                      setState(() {
                        _showBarangay = !_showBarangay;
                        _showProvince = false;
                        _showMunicipality = false;
                      });
                    }
                  },
                  onSelect: (value) {
                    setState(() {
                      _selectedBarangay = value;
                      _showBarangay = false;
                    });
                    BuyerRegistrationErrorStore.instance.clearField('barangay');
                  },
                ),
                _fieldError(_serverError('barangay') ??
                    (_attemptedContinue && _selectedBarangay.isEmpty
                        ? 'Select a barangay.'
                        : null)),
                const SizedBox(height: 16),

                // MANUAL ADDRESS
                _buildSectionTitle('MANUAL ADDRESS'),
                const SizedBox(height: 6),

                // Registration API requires the street and house number.
                _buildLabel('HOUSE NUMBER *'),
                const SizedBox(height: 4),
                _buildTextField(
                  controller: _houseNumberController,
                  hintText: '123',
                  validator: (value) {
                    if (_serverError('house_number') != null) {
                      return _serverError('house_number');
                    }
                    if (value == null || value.trim().isEmpty) {
                      return 'Enter your house or unit number';
                    }
                    if (value.trim().length > 20) {
                      return 'Max 20 characters';
                    }
                    return null;
                  },
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(20),
                  ],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('house_number'),
                ),
                const SizedBox(height: 10),

                _buildLabel('STREET *'),
                const SizedBox(height: 4),
                _buildTextField(
                  controller: _streetController,
                  hintText: 'Sampaguita Street',
                  validator: (value) {
                    if (_serverError('street') != null) {
                      return _serverError('street');
                    }
                    if (value == null || value.trim().isEmpty) {
                      return 'Enter your street';
                    }
                    if (value.trim().length > 100) {
                      return 'Max 100 characters';
                    }
                    return null;
                  },
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(100),
                  ],
                  onChanged: (_) =>
                      BuyerRegistrationErrorStore.instance.clearField('street'),
                ),
                const SizedBox(height: 10),

                _buildLabel('BUILDING / SUBDIVISION'),
                const SizedBox(height: 4),
                _buildTextField(
                  controller: _buildingNameController,
                  hintText: 'Optional',
                  validator: (value) {
                    if (_serverError('building_name') != null) {
                      return _serverError('building_name');
                    }
                    if ((value ?? '').length > 80) return 'Max 80 characters';
                    return null;
                  },
                  inputFormatters: [LengthLimitingTextInputFormatter(80)],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('building_name'),
                ),
                const SizedBox(height: 10),

                _buildLabel('UNIT / FLOOR'),
                const SizedBox(height: 4),
                _buildTextField(
                  controller: _unitNumberController,
                  hintText: 'Optional',
                  validator: (value) {
                    if (_serverError('unit_number') != null) {
                      return _serverError('unit_number');
                    }
                    if ((value ?? '').length > 30) return 'Max 30 characters';
                    return null;
                  },
                  inputFormatters: [LengthLimitingTextInputFormatter(30)],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('unit_number'),
                ),
                const SizedBox(height: 10),

                _buildLabel('POSTAL CODE *'),
                const SizedBox(height: 4),
                _buildTextField(
                  controller: _postalCodeController,
                  hintText: '4-digit postal code',
                  validator: (value) {
                    if (_serverError('postal_code') != null) {
                      return _serverError('postal_code');
                    }
                    return RegExp(r'^\d{4}$').hasMatch(value?.trim() ?? '')
                        ? null
                        : 'Enter a valid 4-digit postal code';
                  },
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('postal_code'),
                ),
                const SizedBox(height: 28),

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
  // STEPPER (walang binago)
  // ============================================================
  Widget _buildStepper({required int currentStep}) {
    return RegistrationProgressHeader(currentStep: currentStep);
  }

  Widget _buildSectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
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
  // TEXT FIELD (✅ UPDATED — may validation na)
  // ============================================================
  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    int maxLines = 1,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
    ValueChanged<String>? onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.lightGray),
        borderRadius: BorderRadius.circular(16),
      ),
      child: TextFormField(
        // ✅ UPDATED: TextField → TextFormField
        controller: controller,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.left,
        maxLines: maxLines,
        validator: validator,
        inputFormatters: inputFormatters,
        onChanged: onChanged,
        style: const TextStyle(
          fontSize: 13,
          color: AppColors.darkGray,
          fontFamily: 'Poppins',
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(
            fontSize: 13,
            color: AppColors.gray,
            fontFamily: 'Poppins',
          ),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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

  // ============================================================
  // DROPDOWN (walang binago)
  // ============================================================
  Widget _buildDropdown({
    required String value,
    required String hint,
    required bool isOpen,
    required List<String> items,
    required VoidCallback onToggle,
    required Function(String) onSelect,
    bool isDisabled = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: isDisabled ? null : onToggle,
          child: Container(
            decoration: BoxDecoration(
              color: isDisabled ? AppColors.lightGray : AppColors.white,
              border: Border.all(color: AppColors.lightGray),
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    value.isEmpty ? hint : value,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color:
                          value.isEmpty ? AppColors.gray : AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
                Icon(
                  isOpen ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                  color: AppColors.gray,
                ),
              ],
            ),
          ),
        ),
        if (isOpen && items.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            constraints: const BoxConstraints(maxHeight: 150),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border.all(color: AppColors.lightGray),
              borderRadius: BorderRadius.circular(10),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return GestureDetector(
                  onTap: () => onSelect(item),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 14),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: index == items.length - 1
                              ? Colors.transparent
                              : AppColors.lightGray,
                        ),
                      ),
                    ),
                    child: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
