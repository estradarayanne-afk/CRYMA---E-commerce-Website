import 'package:flutter/material.dart';
import '../models/address_model.dart';
import '../services/address_service.dart';
import '../services/api_client.dart';

class AddressProvider extends ChangeNotifier {
  final AddressService addressService;

  List<Region> _regions = [];
  List<Province> _provinces = [];
  List<Municipality> _municipalities = [];
  List<Barangay> _barangays = [];

  Region? _selectedRegion;
  Province? _selectedProvince;
  Municipality? _selectedMunicipality;
  Barangay? _selectedBarangay;

  bool _regionsLoading = false;
  bool _provincesLoading = false;
  bool _municipalitiesLoading = false;
  bool _barangaysLoading = false;

  String? _errorMessage;

  AddressProvider({required this.addressService});

  // Getters
  List<Region> get regions => _regions;
  List<Province> get provinces => _provinces;
  List<Municipality> get municipalities => _municipalities;
  List<Barangay> get barangays => _barangays;

  Region? get selectedRegion => _selectedRegion;
  Province? get selectedProvince => _selectedProvince;
  Municipality? get selectedMunicipality => _selectedMunicipality;
  Barangay? get selectedBarangay => _selectedBarangay;

  bool get regionsLoading => _regionsLoading;
  bool get provincesLoading => _provincesLoading;
  bool get municipalitiesLoading => _municipalitiesLoading;
  bool get barangaysLoading => _barangaysLoading;

  String? get errorMessage => _errorMessage;

  Future<void> fetchRegions() async {
    _regionsLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _regions = await addressService.getRegions();
      _regionsLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _regionsLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _regionsLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectRegion(String regionCode) async {
    _selectedRegion = _regions.firstWhere(
      (r) => r.code == regionCode,
      orElse: () => Region(code: '', name: ''),
    );
    _selectedProvince = null;
    _selectedMunicipality = null;
    _selectedBarangay = null;
    _provinces = [];
    _municipalities = [];
    _barangays = [];
    notifyListeners();

    await fetchProvinces(regionCode);
  }

  Future<void> fetchProvinces(String regionCode) async {
    _provincesLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _provinces = await addressService.getProvinces(regionCode);
      _provincesLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _provincesLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _provincesLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectProvince(String provinceCode) async {
    _selectedProvince = _provinces.firstWhere(
      (p) => p.code == provinceCode,
      orElse: () => Province(code: '', name: '', regionCode: ''),
    );
    _selectedMunicipality = null;
    _selectedBarangay = null;
    _municipalities = [];
    _barangays = [];
    notifyListeners();

    await fetchMunicipalities(provinceCode);
  }

  Future<void> fetchMunicipalities(String provinceCode) async {
    _municipalitiesLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _municipalities = await addressService.getMunicipalities(provinceCode);
      _municipalitiesLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _municipalitiesLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _municipalitiesLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectMunicipality(String municipalityCode) async {
    _selectedMunicipality = _municipalities.firstWhere(
      (m) => m.code == municipalityCode,
      orElse: () => Municipality(code: '', name: '', provinceCode: ''),
    );
    _selectedBarangay = null;
    _barangays = [];
    notifyListeners();

    await fetchBarangays(municipalityCode);
  }

  Future<void> fetchBarangays(String municipalityCode) async {
    _barangaysLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _barangays = await addressService.getBarangays(municipalityCode);
      _barangaysLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _barangaysLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _barangaysLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectBarangay(String barangayCode) async {
    _selectedBarangay = _barangays.firstWhere(
      (b) => b.code == barangayCode,
      orElse: () => Barangay(code: '', name: '', municipalityCode: ''),
    );
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void reset() {
    _regions = [];
    _provinces = [];
    _municipalities = [];
    _barangays = [];
    _selectedRegion = null;
    _selectedProvince = null;
    _selectedMunicipality = null;
    _selectedBarangay = null;
    _errorMessage = null;
    notifyListeners();
  }
}
