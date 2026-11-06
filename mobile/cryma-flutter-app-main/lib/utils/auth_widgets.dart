import 'package:flutter/material.dart';

import 'colors.dart';

class CrymaWordmark extends StatelessWidget {
  const CrymaWordmark({
    super.key,
    this.logoSize = 48,
    this.fontSize = 26,
    this.color = AppColors.wine,
    this.onBrandSurface = false,
  });

  final double logoSize;
  final double fontSize;
  final Color color;
  final bool onBrandSurface;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: logoSize,
            height: logoSize,
            padding: EdgeInsets.all(logoSize * .12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(logoSize * .25),
            ),
            child: Image.asset(
              'assets/image/cryma-logo.png',
              fit: BoxFit.contain,
              semanticLabel: 'CRYMA logo',
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.local_mall_outlined,
                color: AppColors.primaryDark,
                size: logoSize * .62,
              ),
            ),
          ),
          SizedBox(width: logoSize * .2),
          Text(
            'CRYMA',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: fontSize * .13,
              color: onBrandSurface ? Colors.white : color,
            ),
          ),
        ],
      );
}

class RegistrationProgressHeader extends StatelessWidget {
  const RegistrationProgressHeader({
    super.key,
    required this.currentStep,
  });

  final int currentStep;

  static const _steps = ['Personal', 'Address', 'Account', 'Verify', 'Review'];

  @override
  Widget build(BuildContext context) {
    final step = currentStep.clamp(1, _steps.length);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 18, 10, 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primaryDark, AppColors.primary],
        ),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: .16),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Back',
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(
                  Icons.arrow_back_rounded,
                  color: Colors.white,
                ),
                padding: EdgeInsets.zero,
                constraints:
                    const BoxConstraints.tightFor(width: 38, height: 42),
              ),
              const SizedBox(width: 4),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CrymaWordmark(
                      logoSize: 34,
                      fontSize: 17,
                      onBrandSurface: true,
                    ),
                    SizedBox(height: 3),
                    Text(
                      'BUYER REGISTRATION',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white24),
                ),
                child: Text(
                  '${step.toString().padLeft(2, '0')} / 05',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: .5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var index = 0; index < _steps.length; index++) ...[
                Expanded(
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: index + 1 <= step
                              ? Colors.white
                              : Colors.white.withValues(alpha: .08),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: .5),
                          ),
                        ),
                        child: Center(
                          child: index + 1 < step
                              ? const Icon(Icons.check,
                                  size: 15, color: AppColors.primaryDark)
                              : Text(
                                  '${index + 1}',
                                  style: TextStyle(
                                    color: index + 1 <= step
                                        ? AppColors.primaryDark
                                        : Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        _steps[index],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white
                              .withValues(alpha: index + 1 <= step ? 1 : .68),
                          fontSize: 9,
                          fontWeight: index + 1 == step
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                if (index < _steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 24,
                      alignment: Alignment.center,
                      child: Container(
                        height: 1.5,
                        color: index + 1 < step
                            ? Colors.white
                            : Colors.white.withValues(alpha: .3),
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class RegistrationCard extends StatelessWidget {
  const RegistrationCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: AppColors.lightGray.withValues(alpha: .7)),
          boxShadow: [
            BoxShadow(
              color: AppColors.wine.withValues(alpha: .09),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: child,
      );
}
