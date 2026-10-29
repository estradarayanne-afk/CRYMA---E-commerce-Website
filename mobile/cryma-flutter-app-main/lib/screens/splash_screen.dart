import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    await Future<void>.delayed(const Duration(seconds: 1));
    String route = '/welcome';
    try {
      if (await ApiService.instance.restoreBuyerSession() != null) {
        route = '/home';
      }
    } catch (_) {
      // Keep the welcome screen available when the API cannot be reached.
    }
    if (mounted) Navigator.pushReplacementNamed(context, route);
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Stack(
        children: [
          // Top-left subtle circle
          Positioned(
            left: -screenWidth * 0.22,
            top: screenHeight * 0.08,
            child: Container(
              width: screenWidth * 0.55,
              height: screenWidth * 0.55,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.035),
              ),
            ),
          ),

          // Top-right subtle outlined circle
          Positioned(
            right: -screenWidth * 0.40,
            top: -screenHeight * 0.16,
            child: Container(
              width: screenWidth * 0.95,
              height: screenWidth * 0.95,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.035),
                  width: 2,
                ),
              ),
            ),
          ),

          // Bottom-left subtle outlined circle
          Positioned(
            left: -screenWidth * 0.30,
            bottom: -screenHeight * 0.04,
            child: Container(
              width: screenWidth * 0.72,
              height: screenWidth * 0.72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.035),
                  width: 2,
                ),
              ),
            ),
          ),

          // Main content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // CRYMA logo icon
                Container(
                  width: screenWidth * 0.18,
                  height: screenWidth * 0.18,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _logoLine(screenWidth * 0.045),
                        const SizedBox(height: 4),
                        _logoLine(screenWidth * 0.055),
                        const SizedBox(height: 4),
                        _logoLine(screenWidth * 0.045),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: screenHeight * 0.035),

                // CRYMA
                Text(
                  'CRYMA',
                  style: TextStyle(
                    fontSize: screenWidth * 0.085,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontFamily: 'Poppins',
                    letterSpacing: screenWidth * 0.012,
                  ),
                ),

                SizedBox(height: screenHeight * 0.018),

                // Small line
                Container(
                  width: screenWidth * 0.10,
                  height: 3,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),

                SizedBox(height: screenHeight * 0.018),

                // Tagline
                Text(
                  'Your Shopping, Your Way',
                  style: TextStyle(
                    fontSize: screenWidth * 0.043,
                    fontWeight: FontWeight.w400,
                    color: Colors.white.withValues(alpha: 0.48),
                    fontFamily: 'Poppins',
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),

          // Bottom page indicator
          Positioned(
            bottom: screenHeight * 0.045,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _indicatorDot(),
                const SizedBox(width: 12),
                Container(
                  width: screenWidth * 0.055,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(width: 12),
                _indicatorDot(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _logoLine(double width) {
    return Container(
      width: width,
      height: 4,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }

  Widget _indicatorDot() {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.35),
      ),
    );
  }
}
