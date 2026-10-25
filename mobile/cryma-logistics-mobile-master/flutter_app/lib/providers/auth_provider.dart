import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService authService;

  User? _currentUser;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _errorMessage;
  String? _accountStatus; // pending, active, rejected
  String? _rejectionReason;

  AuthProvider({required this.authService});

  // Getters
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get accountStatus => _accountStatus;
  String? get rejectionReason => _rejectionReason;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await authService.login(email, password);

      // Parse user from response
      final userData = response.user;
      _currentUser = User.fromJson(userData);
      _accountStatus =
          userData['status'] as String? ?? userData['accountStatus'] as String?;
      _isAuthenticated = true;

      // If rejected, fetch the full account status to get rejection reason
      if (_accountStatus == 'rejected') {
        try {
          final statusResponse = await authService.checkAccountStatus();
          _rejectionReason = statusResponse.rejectionReason;
        } catch (e) {
          // Ignore error fetching rejection reason
        }
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _isLoading = false;
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      _isAuthenticated = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> registerRider(
    Map<String, String> formData, {
    String? licensePhotoPath,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await authService.registerRider(
        formData,
        licensePhotoPath: licensePhotoPath,
      );

      _accountStatus = response.accountStatus;
      _isLoading = false;

      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> checkAccountStatus() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await authService.checkAccountStatus();
      _accountStatus = response.status;
      _rejectionReason = response.rejectionReason;
      _isLoading = false;

      notifyListeners();
      return response.status == 'active';
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> fetchProfile() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await authService.getProfile();
      _currentUser = user;
      _accountStatus = user.accountStatus;
      _isAuthenticated = true;
      _isLoading = false;

      notifyListeners();
      return true;
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        // Token expired, logout
        await logout();
      } else {
        _errorMessage = e.userMessage;
        _isLoading = false;
        notifyListeners();
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await authService.logout();
    } catch (e) {
      // Ignore logout errors
    }

    _currentUser = null;
    _isAuthenticated = false;
    _isLoading = false;
    _errorMessage = null;
    _accountStatus = null;
    _rejectionReason = null;

    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<bool> restoreSession() async {
    final hasToken = await authService.hasToken();
    if (!hasToken) {
      _isAuthenticated = false;
      notifyListeners();
      return false;
    }

    final isValid = await authService.isTokenValid();
    if (!isValid) {
      await logout();
      return false;
    }

    // Token is valid, try to fetch profile
    return await fetchProfile();
  }
}
