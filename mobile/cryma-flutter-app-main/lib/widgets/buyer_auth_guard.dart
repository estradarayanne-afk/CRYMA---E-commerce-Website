import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/colors.dart';

Future<bool> hasBuyerSession() async {
  final preferences = await SharedPreferences.getInstance();
  final token = preferences.getString('cryma_api_token');
  final rawUser = preferences.getString('cryma_api_user');
  if (token == null || token.isEmpty || rawUser == null) return false;

  try {
    final user = jsonDecode(rawUser);
    return user is Map<String, dynamic> && user['role'] == 'buyer';
  } on FormatException {
    return false;
  }
}

Future<String?> showBuyerAuthPrompt(
  BuildContext context, {
  String title = 'Sign in to continue',
  String message = 'Create an account or sign in to use this buyer feature.',
}) {
  return showDialog<String>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      backgroundColor: AppColors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        title,
        style: const TextStyle(
          fontFamily: 'Poppins',
          color: AppColors.wine,
          fontWeight: FontWeight.w700,
        ),
      ),
      content: Text(
        message,
        style: const TextStyle(
          fontFamily: 'Poppins',
          color: AppColors.textSecondary,
          height: 1.45,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('Not now'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(dialogContext, '/register_personal'),
          child: const Text('Create account'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(dialogContext, '/login'),
          child: const Text('Sign in'),
        ),
      ],
    ),
  );
}

Future<bool> requireBuyerSignIn(
  BuildContext context, {
  String title = 'Sign in to continue',
  String message = 'Create an account or sign in to use this buyer feature.',
}) async {
  if (await hasBuyerSession()) return true;
  if (!context.mounted) return false;

  final route = await showBuyerAuthPrompt(
    context,
    title: title,
    message: message,
  );
  if (route != null && context.mounted) {
    await Navigator.pushNamed(context, route);
  }
  return false;
}

class BuyerAuthGuard extends StatefulWidget {
  const BuyerAuthGuard({
    required this.child,
    this.title = 'Sign in to continue',
    this.message = 'Create an account or sign in to use this buyer feature.',
    super.key,
  });

  final Widget child;
  final String title;
  final String message;

  @override
  State<BuyerAuthGuard> createState() => _BuyerAuthGuardState();
}

class _BuyerAuthGuardState extends State<BuyerAuthGuard> {
  bool _checking = true;
  bool _authorized = false;

  @override
  void initState() {
    super.initState();
    _authorize();
  }

  Future<void> _authorize() async {
    if (await hasBuyerSession()) {
      if (mounted) {
        setState(() {
          _checking = false;
          _authorized = true;
        });
      }
      return;
    }

    if (!mounted) return;
    final route = await showBuyerAuthPrompt(
      context,
      title: widget.title,
      message: widget.message,
    );
    if (!mounted) return;

    final navigator = Navigator.of(context);
    if (route == null) {
      navigator.pop();
    } else {
      navigator.pushReplacementNamed(route);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_authorized) return widget.child;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: _checking
            ? const CircularProgressIndicator(color: AppColors.primary)
            : const SizedBox.shrink(),
      ),
    );
  }
}
