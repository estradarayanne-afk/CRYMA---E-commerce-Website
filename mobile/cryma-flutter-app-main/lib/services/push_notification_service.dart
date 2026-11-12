import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PushNotificationService {
  PushNotificationService._();

  static const _tokenKey = 'cryma_api_token';
  static const _registeredTokenKey = 'cryma_fcm_registered_token';
  static const _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cryma.store',
  );
  static const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const _appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const _messagingSenderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

  static bool _enabled = false;
  static GlobalKey<NavigatorState>? _navigatorKey;

  static Future<void> initialize(GlobalKey<NavigatorState> navigatorKey) async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    _navigatorKey = navigatorKey;
    if (_apiKey.isEmpty ||
        _appId.isEmpty ||
        _messagingSenderId.isEmpty ||
        _projectId.isEmpty) {
      debugPrint(
        'Push notifications are disabled: provide the Firebase Dart defines.',
      );
      return;
    }

    try {
      await Firebase.initializeApp(
        options: const FirebaseOptions(
          apiKey: _apiKey,
          appId: _appId,
          messagingSenderId: _messagingSenderId,
          projectId: _projectId,
        ),
      );
      _enabled = true;
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      FirebaseMessaging.onMessageOpenedApp.listen(_openOrder);
      messaging.onRegistered.listen((token) {
        unawaited(_saveAndRegisterToken(token));
      });
      messaging.onUnregistered.listen((token) {
        unawaited(_removeRegisteredToken(token));
      });
      _openOrder(await messaging.getInitialMessage());
      await syncToken();
    } on FirebaseException catch (error) {
      _enabled = false;
      debugPrint('Firebase push setup failed: ${error.message ?? error.code}');
    }
  }

  static Future<void> syncToken() async {
    if (!_enabled) return;

    try {
      final preferences = await SharedPreferences.getInstance();
      final token = preferences.getString(_registeredTokenKey);
      if (token != null && token.isNotEmpty) await _registerToken(token);
      await FirebaseMessaging.instance.register();
    } on FirebaseException catch (error) {
      debugPrint('Unable to get the Firebase push token: ${error.message ?? error.code}');
    }
  }

  static Future<void> unregisterCurrentToken() async {
    if (!_enabled) return;

    try {
      final preferences = await SharedPreferences.getInstance();
      final token = preferences.getString(_registeredTokenKey);
      if (token != null && token.isNotEmpty) {
        await _sendTokenRequest('DELETE', {'token': token});
      }
      await FirebaseMessaging.instance.unregister();
      await preferences.remove(_registeredTokenKey);
    } on FirebaseException catch (error) {
      debugPrint('Unable to unregister the Firebase push token: ${error.message ?? error.code}');
    }
  }

  static Future<void> _saveAndRegisterToken(String token) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_registeredTokenKey, token);
    await _registerToken(token);
  }

  static Future<void> _removeRegisteredToken(String token) async {
    await _sendTokenRequest('DELETE', {'token': token});
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getString(_registeredTokenKey) == token) {
      await preferences.remove(_registeredTokenKey);
    }
  }

  static Future<void> _registerToken(String token) async {
    final preferences = await SharedPreferences.getInstance();
    if (!preferences.containsKey(_tokenKey)) return;

    final platform =
        defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    await _sendTokenRequest('POST', {'token': token, 'platform': platform});
  }

  static Future<void> _sendTokenRequest(
    String method,
    Map<String, String> payload,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final authToken = preferences.getString(_tokenKey);
    if (authToken == null || authToken.isEmpty) return;

    final request = http.Request(
      method,
      Uri.parse(_apiBaseUrl).resolve('/api/buyer/push-tokens'),
    )
      ..headers.addAll({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      })
      ..body = jsonEncode(payload);
    final client = http.Client();
    try {
      final streamed =
          await client.send(request).timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamed);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        debugPrint(
          'Push token registration failed with HTTP ${response.statusCode}.',
        );
      }
    } on http.ClientException catch (error) {
      debugPrint('Push token request failed: ${error.message}');
    } on TimeoutException {
      debugPrint('Push token request timed out.');
    } finally {
      client.close();
    }
  }

  static void _openOrder(RemoteMessage? message) {
    final orderId = message?.data['order_id']?.toString();
    if (orderId == null || orderId.isEmpty) return;
    _navigatorKey?.currentState?.pushNamed('/order_details', arguments: orderId);
  }
}
