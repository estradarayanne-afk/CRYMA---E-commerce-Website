import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../utils/auth_widgets.dart';
import '../../../utils/buyer_registration.dart';
import '../../../utils/colors.dart';
import '../../../utils/philippine_postal_code_lookup.dart';

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
  bool _loadingRegions = true;
  bool _loadingProvinces = false;
  bool _loadingCities = false;
  bool _loadingBarangays = false;
  bool _postalCodeLookupFailed = false;
  String _regionCode = '';
  String _provinceCode = '';
  String _cityCode = '';
  String _selectedRegion = '';
  String _selectedProvince = '';
  String _selectedMunicipality = '';
  String _selectedBarangay = '';

  final TextEditingController _contactNumberController =
      TextEditingController();
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
    _contactNumberController.text =
        widget.contactData?['contactNumber']?.toString() ?? '';
    _loadRegions();
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    _contactNumberController.dispose();
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
    return data.whereType<Map<String, dynamic>>().map((row) {
      final name = row['name'];
      if (name is! String) return row;
      return {
        ...row,
        'name': name.replaceAll('Ã±', 'ñ').replaceAll('Ã‘', 'Ñ'),
      };
    }).toList();
  }

  Future<void> _loadRegions() async {
    setState(() => _loadingRegions = true);
    try {
      final rows = await _fetchOptions('regions');
      if (mounted) setState(() => _regions = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    } finally {
      if (mounted) setState(() => _loadingRegions = false);
    }
  }

  Future<void> _selectRegion(String value) async {
    final row = _regions.firstWhere((item) => item['name'] == value,
        orElse: () => const {});
    final code = row['code']?.toString() ?? '';
    setState(() {
      _attemptedContinue = false;
      _selectedRegion = value;
      _postalCodeController.clear();
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
      _loadingProvinces = true;
    });
    BuyerRegistrationErrorStore.instance.clearField('region');
    try {
      final rows = await _fetchOptions('regions/$code/provinces');
      if (mounted && code == _regionCode) setState(() => _provinces = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    } finally {
      if (mounted && code == _regionCode) {
        setState(() => _loadingProvinces = false);
      }
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
      _postalCodeController.clear();
      _loadingCities = true;
    });
    BuyerRegistrationErrorStore.instance.clearField('province');
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$code/cities-municipalities');
      if (mounted && code == _provinceCode) setState(() => _cities = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    } finally {
      if (mounted && code == _provinceCode) {
        setState(() => _loadingCities = false);
      }
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
      _postalCodeController.clear();
      _loadingBarangays = true;
    });
    BuyerRegistrationErrorStore.instance.clearField('municipality');
    try {
      final suggestedCode = await PhilippinePostalCodeLookup.forLocality(
        _selectedProvince,
        value,
      );
      if (mounted && code == _cityCode && suggestedCode.isNotEmpty) {
        setState(() {
          _postalCodeController.text = suggestedCode;
          _postalCodeLookupFailed = false;
        });
      }
    } on Exception catch (error, stackTrace) {
      debugPrint('Could not load locality postal-code suggestions: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (mounted) setState(() => _postalCodeLookupFailed = true);
    }
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$_provinceCode/cities-municipalities/$code/barangays');
      if (mounted && code == _cityCode) setState(() => _barangayRows = rows);
    } catch (error) {
      if (mounted) _showAlert(error.toString());
    } finally {
      if (mounted && code == _cityCode) {
        setState(() => _loadingBarangays = false);
      }
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
    final isFormValid = _formKey.currentState?.validate() ?? false;
    // Validate location selections before checking the text fields.
    if (!isFormValid ||
        _selectedProvince.isEmpty ||
        _selectedMunicipality.isEmpty ||
        _selectedBarangay.isEmpty ||
        _selectedRegion.isEmpty) {
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
        'contactData': {
          ...?widget.contactData,
          'contactNumber': _contactNumberController.text.trim(),
        },
        'addressData': addressData,
      },
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
            child: Form(
              key: _formKey,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // STEPPER
                  _buildStepper(currentStep: 2),
                  const SizedBox(height: 22),

                  // INTRO
                  const Text(
                    'Contact & address',
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Choose the places couriers use to find you.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 18),

                  _buildLabel('CONTACT NUMBER *'),
                  _buildTextField(
                    controller: _contactNumberController,
                    hintText: '09171234567',
                    validator: (value) =>
                        _serverError('phone') ??
                        BuyerRegistrationRules.validatePhone(value),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ],
                    onChanged: (_) => BuyerRegistrationErrorStore.instance
                        .clearField('phone'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 16),

                  // LOCATION SECTION
                  _buildSectionTitle('PHILIPPINE LOCATION'),
                  const SizedBox(height: 6),

                  _buildDropdown(
                    label: 'Region',
                    icon: Icons.map_outlined,
                    value: _selectedRegion,
                    hint:
                        _loadingRegions ? 'Loading regions…' : 'Select region',
                    isOpen: _showRegion,
                    items:
                        _regions.map((row) => row['name'].toString()).toList(),
                    isDisabled: _loadingRegions || _regions.isEmpty,
                    isLoading: _loadingRegions,
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
                  _buildDropdown(
                    label: 'Province',
                    icon: Icons.location_city_outlined,
                    value: _selectedProvince,
                    hint: _loadingProvinces
                        ? 'Loading provinces…'
                        : 'Select province',
                    isOpen: _showProvince,
                    items: _provinces
                        .map((row) => row['name'].toString())
                        .toList(),
                    isDisabled: _selectedRegion.isEmpty ||
                        _loadingProvinces ||
                        _provinces.isEmpty,
                    isLoading: _loadingProvinces,
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
                  _buildDropdown(
                    label: 'City / Municipality',
                    icon: Icons.location_city_outlined,
                    value: _selectedMunicipality,
                    hint: _loadingCities
                        ? 'Loading cities / municipalities…'
                        : 'Select city / municipality',
                    isOpen: _showMunicipality,
                    items: _getMunicipalities(),
                    isDisabled: _selectedProvince.isEmpty ||
                        _loadingCities ||
                        _cities.isEmpty,
                    isLoading: _loadingCities,
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
                  _buildDropdown(
                    label: 'Barangay',
                    icon: Icons.place_outlined,
                    value: _selectedBarangay,
                    hint: _loadingBarangays
                        ? 'Loading barangays…'
                        : 'Select barangay',
                    isOpen: _showBarangay,
                    items: _getBarangays(),
                    isDisabled: _selectedMunicipality.isEmpty ||
                        _loadingBarangays ||
                        _barangayRows.isEmpty,
                    isLoading: _loadingBarangays,
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
                      BuyerRegistrationErrorStore.instance
                          .clearField('barangay');
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
                    onChanged: (_) => BuyerRegistrationErrorStore.instance
                        .clearField('street'),
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
                  Text(
                    _postalCodeLookupFailed
                        ? 'Postal-code suggestions are unavailable. Enter the correct four-digit code.'
                        : 'Suggested from the locality reference when available. Please verify it is correct.',
                    style: const TextStyle(
                      color: AppColors.gray,
                      fontSize: 11,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 6),
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
    TextInputType? keyboardType,
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
        keyboardType: keyboardType,
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
    required String label,
    required IconData icon,
    required String value,
    required String hint,
    required bool isOpen,
    required List<String> items,
    required VoidCallback onToggle,
    required Function(String) onSelect,
    bool isDisabled = false,
    bool isLoading = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: isDisabled
              ? null
              : () async {
                  onToggle();
                  final pickerName = hint.startsWith('Select ')
                      ? hint.substring('Select '.length)
                      : hint;
                  final selected = await showModalBottomSheet<String>(
                    context: context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => _LocationPickerSheet(
                      title: 'Choose $pickerName',
                      options: items,
                      selectedValue: value,
                    ),
                  );
                  if (!mounted) return;
                  if (selected == null) {
                    onToggle();
                  } else {
                    onSelect(selected);
                  }
                },
          child: Container(
            constraints: const BoxConstraints(minHeight: 76),
            decoration: BoxDecoration(
              color: isDisabled ? const Color(0xFFFAF7F7) : Colors.white,
              border: Border.all(
                color: AppColors.primary.withValues(alpha: .28),
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
            child: Row(
              children: [
                Icon(icon, color: AppColors.primary, size: 23),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        value.isEmpty ? hint : value,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight:
                              value.isEmpty ? FontWeight.w400 : FontWeight.w600,
                          color: value.isEmpty
                              ? AppColors.gray
                              : AppColors.darkGray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        isOpen
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.primary,
                      ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LocationPickerSheet extends StatefulWidget {
  const _LocationPickerSheet({
    required this.title,
    required this.options,
    required this.selectedValue,
  });

  final String title;
  final List<String> options;
  final String selectedValue;

  @override
  State<_LocationPickerSheet> createState() => _LocationPickerSheetState();
}

class _LocationPickerSheetState extends State<_LocationPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final options = widget.options
        .where((option) => option.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Container(
      height: MediaQuery.sizeOf(context).height * .76,
      decoration: const BoxDecoration(
        color: Color(0xFFFFF8F8),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: AppColors.lightGray,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value.trim()),
              decoration: InputDecoration(
                hintText:
                    'Search ${widget.title.replaceFirst('Choose ', '').toLowerCase()}...',
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.lightGray),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.lightGray),
                ),
              ),
            ),
          ),
          Expanded(
            child: options.isEmpty
                ? const Center(
                    child: Text(
                      'No matching locations',
                      style: TextStyle(
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
                    itemCount: options.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, color: AppColors.lightGray),
                    itemBuilder: (context, index) {
                      final option = options[index];
                      final isSelected = option == widget.selectedValue;
                      return Material(
                        color: Colors.transparent,
                        child: ListTile(
                          contentPadding:
                              const EdgeInsets.symmetric(horizontal: 6),
                          title: Text(
                            option,
                            style: TextStyle(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.darkGray,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          trailing: Icon(
                            isSelected
                                ? Icons.check_circle_rounded
                                : Icons.chevron_right_rounded,
                            color:
                                isSelected ? AppColors.primary : AppColors.gray,
                          ),
                          onTap: () => Navigator.pop(context, option),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
