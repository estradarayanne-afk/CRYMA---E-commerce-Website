import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const String _tokenKey = 'auth_token';
  static const String _tokenExpiryKey = 'token_expiry';

  final FlutterSecureStorage _storage;

  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token, {int? expiresIn}) async {
    await _storage.write(key: _tokenKey, value: token);
    if (expiresIn != null) {
      final expiry = DateTime.now().add(Duration(seconds: expiresIn));
      await _storage.write(key: _tokenExpiryKey, value: expiry.toIso8601String());
    }
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<DateTime?> getTokenExpiry() async {
    final expiryStr = await _storage.read(key: _tokenExpiryKey);
    if (expiryStr != null) {
      return DateTime.parse(expiryStr);
    }
    return null;
  }

  Future<bool> hasToken() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<bool> isTokenExpired() async {
    final expiry = await getTokenExpiry();
    if (expiry == null) {
      return true;
    }
    return DateTime.now().isAfter(expiry);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _tokenExpiryKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
