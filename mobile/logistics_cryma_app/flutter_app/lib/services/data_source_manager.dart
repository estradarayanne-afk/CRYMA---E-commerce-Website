import 'package:http/http.dart' as http;
import '../config/app_config.dart';

/// Determines whether to use the local API server or the on-device SQLite DB.
///
/// RULE: If the local API server is reachable, it is ALWAYS the source of truth.
///       Local SQLite data gets OVERWRITTEN by server data on every successful sync.
///       Local SQLite is only used when the server is completely unreachable.
class DataSourceManager {
  static bool _serverAvailable = false;
  static DateTime? _lastCheck;
  static const _recheckInterval = Duration(seconds: 30);

  /// Returns true if the local API server is reachable.
  static bool get isServerAvailable => _serverAvailable;

  /// Ping the API health endpoint to determine availability.
  /// Caches the result for [_recheckInterval] to avoid hammering the network.
  static Future<bool> checkServerAvailability() async {
    final now = DateTime.now();
    if (_lastCheck != null && now.difference(_lastCheck!) < _recheckInterval) {
      return _serverAvailable;
    }

    try {
      final response = await http
          .get(Uri.parse('${AppConfig.apiBaseUrl}/health'))
          .timeout(const Duration(seconds: 5));
      _serverAvailable = response.statusCode == 200;
    } catch (_) {
      _serverAvailable = false;
    }

    _lastCheck = now;
    return _serverAvailable;
  }

  /// Force a fresh availability check, ignoring the cache.
  static Future<bool> forceCheck() async {
    _lastCheck = null;
    return checkServerAvailability();
  }

  /// Call this after a successful server response to mark server as available
  /// and trigger a local DB overwrite.
  ///
  /// RIGHT HERE STUPID — plug in the full sync logic when the server DB
  /// (PostgreSQL / remote) replaces the local SQLite API backend.
  /// Steps to implement:
  ///   1. Fetch all orders for the current user from the remote server
  ///   2. Call LocalDatabase.clearAll()
  ///   3. Write the fetched records into LocalDatabase
  ///   4. Update _serverAvailable = true
  static void markServerAvailable() {
    _serverAvailable = true;
    _lastCheck = DateTime.now();
  }

  /// Call this when a server request fails to mark server as unavailable
  /// and fall back to local SQLite.
  static void markServerUnavailable() {
    _serverAvailable = false;
    _lastCheck = DateTime.now();
  }
}
