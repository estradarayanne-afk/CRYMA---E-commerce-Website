import 'package:flutter/material.dart';

import '../utils/auth_widgets.dart';
import '../utils/colors.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final horizontalInset = width < 370 ? 18.0 : 24.0;
              final heroHeight =
                  (constraints.maxHeight * .46).clamp(350.0, 470.0).toDouble();
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(horizontalInset, 14,
                        horizontalInset, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const CrymaWordmark(logoSize: 42, fontSize: 23),
                            const Spacer(),
                            OutlinedButton(
                              onPressed: () => Navigator.pushReplacementNamed(
                                  context, '/home'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.textSecondary,
                                side: const BorderSide(
                                    color: AppColors.lightGray),
                                shape: const StadiumBorder(),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 12),
                              ),
                              child: const Text(
                                'SHOP  •  DISCOVER',
                                style: TextStyle(
                                  fontSize: 10,
                                  letterSpacing: 1.1,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        OverflowBox(
                          alignment: Alignment.centerLeft,
                          minWidth: width,
                          maxWidth: width,
                          child: Transform.translate(
                            offset: Offset(-horizontalInset, 0),
                            child: SizedBox(
                              width: width,
                              child: _EditorialHero(height: heroHeight),
                            ),
                          ),
                        ),
                        const SizedBox(height: 23),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 9),
                          decoration: BoxDecoration(
                            color: AppColors.softRose,
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                                color: AppColors.floralPink.withValues(alpha: .7)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.location_on_outlined,
                                  size: 15, color: AppColors.primaryDark),
                              SizedBox(width: 6),
                              Text('LOCAL FINDS · REAL PEOPLE',
                                  style: TextStyle(
                                      color: AppColors.primaryDark,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.15)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 13),
                        const Text(
                          'A MARKETPLACE THAT FEELS CLOSER.',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.55,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Good things\nmove closer.',
                          style: TextStyle(
                            color: AppColors.wine,
                            fontSize: width < 370 ? 37 : 43,
                            fontWeight: FontWeight.w700,
                            height: 1.12,
                            letterSpacing: -1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Meet independent sellers, find things you love, and get them delivered through CRYMA — all in one local marketplace.',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 15,
                            height: 1.65,
                          ),
                        ),
                        const SizedBox(height: 21),
                        SizedBox(
                          width: double.infinity,
                          height: 62,
                          child: FilledButton.icon(
                            onPressed: () => Navigator.pushReplacementNamed(
                                context, '/home'),
                            icon: const Icon(Icons.explore_outlined),
                            label: const Text('Explore the marketplace'),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              textStyle: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                letterSpacing: .2,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(17),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text('New to CRYMA? ',
                                  style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 14)),
                              TextButton(
                                onPressed: () => Navigator.pushNamed(
                                    context, '/register_personal'),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.primaryDark,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 4, vertical: 8),
                                ),
                                child: const Text('Create an account',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      );
}

class _EditorialHero extends StatelessWidget {
  const _EditorialHero({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) => Container(
        height: height,
        clipBehavior: Clip.antiAlias,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFA82748), AppColors.primaryDark, AppColors.wine],
            stops: [0, .55, 1],
          ),
          borderRadius: BorderRadius.zero,
        ),
        child: Stack(
          children: [
            Positioned(
              right: -height * .25,
              top: height * .04,
              child: _Ring(size: height * .86, opacity: .12),
            ),
            Positioned(
              right: -height * .12,
              top: height * .18,
              child: _Ring(size: height * .63, opacity: .1),
            ),
            Positioned(
              right: -height * .04,
              top: height * .28,
              child: _Ring(size: height * .4, opacity: .1),
            ),
            Positioned(
              left: -height * .28,
              bottom: -height * .37,
              child: _Ring(size: height * .7, opacity: .08),
            ),
            const Positioned(
              left: 20,
              top: 24,
              child: _Eyebrow(label: 'THE CRYMA EDITION'),
            ),
            Center(
              child: Container(
                width: height * .34,
                height: height * .34,
                padding: EdgeInsets.all(height * .065),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(23),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: .12),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Image.asset(
                  'assets/image/cryma-logo.png',
                  fit: BoxFit.contain,
                  semanticLabel: 'CRYMA emblem',
                  errorBuilder: (context, error, stackTrace) => const Icon(
                    Icons.local_mall_outlined,
                    color: AppColors.primaryDark,
                    size: 86,
                  ),
                ),
              ),
            ),
            Positioned(
              right: 15,
              top: height * .4,
              child: RotatedBox(
                quarterTurns: 1,
                child: Text(
                  'CURATED FOR EVERYDAY LIVING',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .75),
                    fontSize: 9,
                    letterSpacing: 2.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            Positioned(
              left: 22,
              right: 22,
              bottom: 25,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Eyebrow(label: 'LOCAL FINDS. REAL PEOPLE.'),
                        SizedBox(height: 10),
                        Text(
                          'Closer to what you love.',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 25,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -.7,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '01 / 01',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .75),
                      fontSize: 11,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(
              width: 24, height: 2, color: Colors.white.withValues(alpha: .8)),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .9),
              fontSize: 9,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
        ],
      );
}

class _Ring extends StatelessWidget {
  const _Ring({required this.size, required this.opacity});
  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.white.withValues(alpha: opacity),
            width: 1.2,
          ),
        ),
      );
}
