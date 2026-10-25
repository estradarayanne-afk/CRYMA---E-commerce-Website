import 'package:flutter/material.dart';
import '../utils/colors.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F9F7),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // TOP IMAGE
            // ============================================================
            SizedBox(
              width: double.infinity,
              height: screenHeight * 0.52,
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(38),
                      bottomRight: Radius.circular(38),
                    ),
                    child: Image.asset(
                      'assets/image/welcome_page.jpg',
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),

                  // White fade at the bottom of the image
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: screenHeight * 0.18,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white.withValues(alpha: 0.0),
                            Colors.white.withValues(alpha: 0.96),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // CRYMA logo text
                  Positioned(
                    top: screenHeight * 0.025,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Text(
                        'CRYMA',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: screenWidth * 0.075,
                          fontWeight: FontWeight.w700,
                          letterSpacing: screenWidth * 0.012,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ============================================================
            // BOTTOM CONTENT
            // ============================================================
            Expanded(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  screenWidth * 0.075,
                  screenHeight * 0.035,
                  screenWidth * 0.075,
                  screenHeight * 0.025,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ======================================================
                    // WELCOME TITLE
                    // ======================================================
                    Text(
                      'Welcome to\nCRYMA',
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: screenWidth * 0.075,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        height: 1.12,
                      ),
                    ),

                    SizedBox(height: screenHeight * 0.022),

                    // ======================================================
                    // DESCRIPTION
                    // ======================================================
                    Text(
                      'Discover thousands of products from trusted '
                      'sellers. Shop smarter, faster, and better.',
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: screenWidth * 0.041,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xFF687477),
                        height: 1.45,
                      ),
                    ),

                    const Spacer(),

                    // ======================================================
                    // LOGIN BUTTON
                    // ======================================================
                    SizedBox(
                      width: double.infinity,
                      height: screenHeight * 0.068,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pushNamed(context, '/login');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(22),
                          ),
                        ),
                        child: Text(
                          'Login',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: screenWidth * 0.045,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),

                    SizedBox(height: screenHeight * 0.018),

                    // ======================================================
                    // CREATE ACCOUNT BUTTON
                    // ======================================================
                    SizedBox(
                      width: double.infinity,
                      height: screenHeight * 0.068,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pushNamed(
                            context,
                            '/register-account',
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          backgroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.zero,
                          side: BorderSide(
                            color: AppColors.primary,
                            width: 2,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(22),
                          ),
                        ),
                        child: Text(
                          'Create Account',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: screenWidth * 0.045,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
