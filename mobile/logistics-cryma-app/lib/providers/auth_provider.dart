import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';
import '../services/rider_auth_service.dart';

enum UserType { rider, superUser }

class AuthProvider extends ChangeNotifier {
  bool _isLoggedIn = false;
  UserType? _userType;
  int? _userId;
  String _userName = '';
  String _userEmail = '';
  String _phone = '';

  bool get isLoggedIn => _isLoggedIn;
  UserType? get userType => _userType;
  int? get userId => _userId;
  String get userName => _userName;
  String get userEmail => _userEmail;
  String get phone => _phone;

  Future<String?> login(String email, String password) async {
    try {
      final account = await RiderAuthService.instance.login(email, password);
      await _saveAccount(account);
      return null;
    } on ApiException catch (error) {
      return error.message;
    }
  }

  Future<String?> logout() async {
    String? errorMessage;
    try {
      await RiderAuthService.instance.logout();
    } on ApiException catch (error) {
      errorMessage = error.message;
    } finally {
      await _clearLocalSession();
    }
    return errorMessage;
  }

  Future<bool> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = await RiderAuthService.instance.readToken();
    if (token == null || token.isEmpty) return false;

    try {
      final account = await RiderAuthService.instance.currentUser();
      await _saveAccount(account);
      return true;
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await RiderAuthService.instance.clearToken();
        await _clearLocalSession();
        return false;
      }

      final cachedId = prefs.getInt('userId');
      if (cachedId == null) return false;
      _isLoggedIn = true;
      _userType = UserType.rider;
      _userId = cachedId;
      _userName = prefs.getString('userName') ?? '';
      _userEmail = prefs.getString('userEmail') ?? '';
      _phone = prefs.getString('userPhone') ?? '';
      notifyListeners();
      return true;
    }
  }

  Future<void> refreshUser(int userId, String newName) async {
    if (_userId != userId) return;
    _userName = newName;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userName', newName);
    notifyListeners();
  }

  Future<void> _saveAccount(RiderAccount account) async {
    _isLoggedIn = true;
    _userType = UserType.rider;
    _userId = account.id;
    _userEmail = account.email;
    _userName = account.fullName;
    _phone = account.phone ?? '';

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setInt('userId', account.id);
    await prefs.setString('userType', UserType.rider.name);
    await prefs.setString('userName', _userName);
    await prefs.setString('userEmail', _userEmail);
    await prefs.setString('userPhone', _phone);
    notifyListeners();
  }

  Future<void> _clearLocalSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('isLoggedIn');
    await prefs.remove('userId');
    await prefs.remove('userType');
    await prefs.remove('userName');
    await prefs.remove('userEmail');
    await prefs.remove('userPhone');
    _isLoggedIn = false;
    _userType = null;
    _userId = null;
    _userName = '';
    _userEmail = '';
    _phone = '';
    notifyListeners();
  }
}
