import 'package:flutter/material.dart';

import '../../utils/colors.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.primaryDark,
        body: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/image/welcome_page.jpg',
              fit: BoxFit.cover,
              alignment: const Alignment(0.55, 0),
              errorBuilder: (_, __, ___) =>
                  const ColoredBox(color: AppColors.primaryDark),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xB8741F35),
                    Color(0xD6741F35),
                    Color(0xF2292326),
                  ],
                  stops: [0, .38, 1],
                ),
              ),
            ),
            const Positioned(
              top: -110,
              right: -135,
              child: _OutlineRing(size: 330),
            ),
            const Positioned(
              top: -72,
              right: -96,
              child: _OutlineRing(size: 250),
            ),
            const Positioned(
              bottom: -180,
              left: -175,
              child: _OutlineRing(size: 390),
            ),
            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.maxWidth;
                  final topSpace =
                      (constraints.maxHeight * .15).clamp(54.0, 112.0);
                  return SingleChildScrollView(
                    child: ConstrainedBox(
                      constraints:
                          BoxConstraints(minHeight: constraints.maxHeight),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          width < 360 ? 23 : 28,
                          24,
                          width < 360 ? 23 : 28,
                          18,
                        ),
                        child: IntrinsicHeight(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 13,
                                vertical: 9,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: .12),
                                borderRadius: BorderRadius.circular(30),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: .32),
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.location_on_outlined,
                                    size: 15,
                                    color: Colors.white,
                                  ),
                                  SizedBox(width: 7),
                                  Flexible(
                                    child: Text(
                                      'LOCAL FINDS · REAL PEOPLE',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.15,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(height: topSpace),
                            Text(
                              'A MARKETPLACE THAT FEELS CLOSER.',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: .78),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.6,
                              ),
                            ),
                            const SizedBox(height: 13),
                            Text(
                              'Good things\nmove closer.',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: width < 360 ? 43 : 49,
                                fontWeight: FontWeight.w700,
                                height: 1.02,
                                letterSpacing: -1.6,
                              ),
                            ),
                            const SizedBox(height: 17),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 350),
                              child: Text(
                                'Meet local sellers, discover things you love, and have your finds delivered.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: .88),
                                  fontSize: 15,
                                  height: 1.55,
                                ),
                              ),
                            ),
                            const Spacer(),
                            const SizedBox(height: 28),
                            SizedBox(
                              width: double.infinity,
                              height: 60,
                              child: FilledButton.icon(
                                onPressed: () => Navigator.pushReplacementNamed(
                                  context,
                                  '/home',
                                ),
                                icon: const Icon(Icons.arrow_forward_rounded),
                                label: const Text('Explore the marketplace'),
                                style: FilledButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primaryDark,
                                  textStyle: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Center(
                              child: TextButton(
                                onPressed: () => Navigator.pushNamed(
                                  context,
                                  '/register_personal',
                                ),
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(48, 48),
                                  textStyle: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                child: const Text('Create an account'),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Center(
                              child: Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text(
                                    'Already have an account? ',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: .8),
                                      fontSize: 13,
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pushNamed(
                                      context,
                                      '/login',
                                    ),
                                    style: TextButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      minimumSize: const Size(48, 48),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 4,
                                      ),
                                      textStyle: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        decoration: TextDecoration.underline,
                                        decorationColor: Colors.white,
                                      ),
                                    ),
                                    child: const Text('Sign in'),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
                },
              ),
            ),
          ],
        ),
      );
}

class _OutlineRing extends StatelessWidget {
  const _OutlineRing({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: SizedBox.square(
          dimension: size,
          child: DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: .12),
                width: 1,
              ),
            ),
          ),
        ),
      );
}
