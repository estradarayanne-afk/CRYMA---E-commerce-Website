import 'dart:async';

import 'package:flutter/material.dart';

import 'navigation/app_router.dart';
import 'services/api_service.dart';
import 'services/push_notification_service.dart';
import 'theme/app_theme.dart';
import 'utils/colors.dart';
import 'widgets/network_loading_indicator.dart';

final _navigatorKey = GlobalKey<NavigatorState>();

void main() {
  runApp(MyApp(navigatorKey: _navigatorKey));
  unawaited(PushNotificationService.initialize(_navigatorKey));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'CRYMA',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.background, AppColors.surfaceNeutral],
          ),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            child ?? const SizedBox.shrink(),
            Positioned.fill(
              child: IgnorePointer(
                child: ValueListenableBuilder<int>(
                  valueListenable: ApiService.activeRequests,
                  builder: (context, activeRequests, _) =>
                      NetworkLoadingIndicator(isLoading: activeRequests > 0),
                ),
              ),
            ),
          ],
        ),
      ),
      initialRoute: '/',
      onGenerateRoute: AppRouter.generateRoute,
    );
  }
}
