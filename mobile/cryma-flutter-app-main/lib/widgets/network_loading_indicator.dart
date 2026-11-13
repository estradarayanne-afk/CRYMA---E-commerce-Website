import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../utils/colors.dart';

class NetworkLoadingIndicator extends StatefulWidget {
  const NetworkLoadingIndicator({
    required this.isLoading,
    super.key,
  });

  final bool isLoading;

  @override
  State<NetworkLoadingIndicator> createState() =>
      _NetworkLoadingIndicatorState();
}

class _NetworkLoadingIndicatorState extends State<NetworkLoadingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _tiltController;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    _tiltController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1700),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.of(context).disableAnimations;
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant NetworkLoadingIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isLoading != oldWidget.isLoading) _syncAnimation();
  }

  void _syncAnimation() {
    if (widget.isLoading && !_reduceMotion) {
      _tiltController.repeat();
    } else {
      _tiltController.stop();
    }
  }

  @override
  void dispose() {
    _tiltController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) return const SizedBox.shrink();

    final logo = Image.asset(
      'assets/image/cryma-favicon.png',
      width: 160,
      height: 160,
      fit: BoxFit.contain,
    );
    return Semantics(
      liveRegion: true,
      label: 'Loading CRYMA',
      excludeSemantics: true,
      child: ColoredBox(
        color: AppColors.primaryDark.withValues(alpha: 0.34),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 156,
                height: 156,
                child: AnimatedBuilder(
                  animation: _tiltController,
                  builder: (context, _) {
                    final phase = _tiltController.value * 2 * math.pi;
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        if (_reduceMotion)
                          Container(
                            width: 136,
                            height: 136,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.floralPink
                                    .withValues(alpha: 0.65),
                                width: 2,
                              ),
                            ),
                          ),
                        if (!_reduceMotion)
                          SizedBox(
                            width: 136,
                            height: 136,
                            child: CircularProgressIndicator(
                              value: _tiltController.value,
                              strokeWidth: 2.5,
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                AppColors.floralPink,
                              ),
                              backgroundColor:
                                  AppColors.white.withValues(alpha: 0.16),
                            ),
                          ),
                        if (!_reduceMotion)
                          Transform.rotate(
                            angle: phase,
                            child: SizedBox(
                              width: 136,
                              height: 136,
                              child: Align(
                                alignment: Alignment.topCenter,
                                child: Container(
                                  width: 9,
                                  height: 9,
                                  decoration: BoxDecoration(
                                    color: AppColors.floralPink,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.floralPink
                                            .withValues(alpha: 0.85),
                                        blurRadius: 12,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (_reduceMotion)
                          Transform(
                            alignment: Alignment.center,
                            transform: Matrix4.identity()
                              ..setEntry(3, 2, 0.003)
                              ..rotateY(-0.2)
                              ..rotateX(0.08),
                            child: logo,
                          )
                        else
                          Transform.translate(
                            offset: Offset(0, -10 * math.sin(phase)),
                            child: Transform(
                              alignment: Alignment.center,
                              transform: Matrix4.identity()
                                ..setEntry(3, 2, 0.003)
                                ..rotateY(0.7 * math.sin(phase))
                                ..rotateX(0.3 * math.cos(phase))
                                ..rotateZ(0.12 * math.sin(phase)),
                              child: logo,
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Loading CRYMA',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  shadows: [
                    Shadow(
                      color: Colors.black38,
                      blurRadius: 12,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: 160,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    minHeight: 3,
                    color: AppColors.floralPink,
                    backgroundColor: Colors.white.withValues(alpha: 0.24),
                    semanticsLabel: 'Loading CRYMA',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
