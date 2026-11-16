import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QrScannerScreen extends StatefulWidget {
  final String expectedQrCode;
  final String title;
  final String instruction;
  const QrScannerScreen({
    super.key,
    required this.expectedQrCode,
    this.title = 'Scan Parcel QR Code',
    this.instruction = "Point the camera at the parcel's QR code label",
  });

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _ctrl = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  bool _handled = false;
  bool _analyzing = false;
  bool _errorDialogOpen = false;
  String? _cameraError;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  // ── Camera scan ────────────────────────────────────────────────────────────
  void _onDetect(BarcodeCapture capture) {
    if (_handled || _analyzing || _errorDialogOpen) return;
    final value = _readQrValue(capture.barcodes);
    if (value == null) return;
    _handled = true;
    _ctrl.stop();
    _handleResult(value);
  }

  // ── Upload from gallery ────────────────────────────────────────────────────
  Future<void> _uploadImage() async {
    if (_handled || _analyzing) return;
    try {
      await _ctrl.stop();
      final image = await ImagePicker().pickImage(source: ImageSource.gallery);
      if (!mounted) return;
      if (image == null) {
        await _resumeScanner();
        return;
      }

      await _ctrl.stop();
      final file = File(image.path);
      if (!await file.exists()) {
        _showImageError(
          'The selected image is no longer available. Choose it again from your gallery.',
        );
        return;
      }

      setState(() => _analyzing = true);
      final result = await _ctrl.analyzeImage(file.absolute.path);

      if (!mounted) return;
      setState(() => _analyzing = false);

      final value = result == null ? null : _readQrValue(result.barcodes);
      if (value == null) {
        _showError(
          title: 'Invalid Image',
          message: 'No QR code was detected in the selected image. '
              'Please choose a clear, unobstructed photo of the QR code label.',
          onRetry: _retryImageAnalysis,
        );
        return;
      }

      _handled = true;
      _handleResult(value);
    } on PlatformException catch (error) {
      if (!mounted) return;
      setState(() => _analyzing = false);
      _showImageError(
        error.message?.trim().isNotEmpty == true
            ? error.message!.trim()
            : 'The image scanner could not read this file. Choose another image or enter the code manually.',
      );
    } on MobileScannerException catch (error) {
      if (!mounted) return;
      setState(() => _analyzing = false);
      _showImageError(
        error.errorDetails?.message ??
            'The image scanner could not read this file. Choose another image or enter the code manually.',
      );
    } on FileSystemException catch (error) {
      if (!mounted) return;
      setState(() => _analyzing = false);
      _showImageError(error.message);
    }
  }

  String? _readQrValue(Iterable<Barcode> barcodes) {
    for (final barcode in barcodes) {
      if (barcode.format != BarcodeFormat.qrCode) continue;
      final value = barcode.rawValue?.trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return null;
  }

  void _showImageError(String message) {
    _showError(
      title: 'Could not analyze image',
      message: message,
      onRetry: _retryImageAnalysis,
      resumeScanner: true,
    );
  }

  void _retryImageAnalysis() {
    _resumeScanner().then((_) {
      if (mounted) _uploadImage();
    });
  }

  Future<void> _resumeScanner() async {
    try {
      if (mounted) setState(() => _cameraError = null);
      await _ctrl.start();
      if (mounted && _ctrl.value.isRunning) {
        setState(() => _cameraError = null);
      }
    } on PlatformException catch (error) {
      if (mounted) {
        setState(() =>
            _cameraError = error.message ?? 'Camera could not be started.');
      }
    } on MobileScannerException catch (error) {
      if (mounted) {
        setState(() => _cameraError =
            error.errorDetails?.message ?? 'Camera could not be started.');
      }
    }
  }

  Future<void> _enterCode() async {
    if (_handled || _analyzing) return;
    _handled = true;
    try {
      await _ctrl.stop();
    } catch (_) {
      // Manual verification can still be used if the camera cannot stop.
    }
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter parcel code'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Parcel code',
            ),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Enter the parcel code.'
                : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.of(context).pop(controller.text.trim());
              }
            },
            child: const Text('Verify code'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (!mounted) return;
    if (code == null) {
      _handled = false;
      await _resumeScanner();
      return;
    }
    _handleResult(code);
  }

  // ── Shared result handler ──────────────────────────────────────────────────
  void _handleResult(String value) {
    if (value.trim() == widget.expectedQrCode.trim()) {
      Navigator.of(context).pop(true);
    } else {
      _showError(
        title: 'Wrong QR Code',
        message: 'This QR code does not match the order. '
            'Please scan or upload the correct parcel label.',
        onRetry: () {
          setState(() => _handled = false);
          _resumeScanner();
        },
      );
    }
  }

  void _showError({
    required String title,
    required String message,
    required VoidCallback onRetry,
    bool resumeScanner = false,
  }) {
    _errorDialogOpen = true;
    final dialog = showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop(false);
            },
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              onRetry();
            },
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
    if (resumeScanner) _resumeScanner();
    dialog.whenComplete(() => _errorDialogOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
        leading: BackButton(onPressed: () => Navigator.of(context).pop(false)),
        actions: [
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _ctrl,
            builder: (context, state, _) => IconButton(
              icon: const Icon(Icons.flash_on),
              onPressed: state.isRunning ? _ctrl.toggleTorch : null,
              tooltip: 'Toggle flash',
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera feed
          MobileScanner(
            controller: _ctrl,
            onDetect: _onDetect,
            placeholderBuilder: (context, _) => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
            errorBuilder: (context, error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.no_photography_outlined,
                      color: Colors.white,
                      size: 44,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      error.errorCode == MobileScannerErrorCode.permissionDenied
                          ? 'Camera access was denied. Enable camera permission in Android Settings, then close and reopen the scanner. You can also upload a QR image or enter the parcel code manually.'
                          : (_cameraError ??
                              error.errorDetails?.message ??
                              'Camera is unavailable. Upload a QR image or enter the parcel code manually.'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white),
                    ),
                    if (error.errorCode !=
                        MobileScannerErrorCode.permissionDenied) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _resumeScanner,
                        child: const Text('Try camera again'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),

          // Scan frame overlay
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),

          // Instruction text
          Positioned(
            bottom: 120,
            left: 24,
            right: 24,
            child: Text(
              widget.instruction,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                shadows: [Shadow(blurRadius: 4, color: Colors.black)],
              ),
            ),
          ),

          // Upload and typed-code options
          Positioned(
            bottom: 28,
            left: 0,
            right: 0,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_analyzing)
                    const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: Colors.white),
                        SizedBox(height: 10),
                        Text(
                          'Analyzing image...',
                          style: TextStyle(color: Colors.white, fontSize: 13),
                        ),
                      ],
                    )
                  else ...[
                    TextButton.icon(
                      onPressed: _uploadImage,
                      icon: const Icon(Icons.upload_file_outlined,
                          color: Colors.white),
                      label: const Text(
                        'Upload QR Image',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.15),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24)),
                      ),
                    ),
                    TextButton(
                      onPressed: _enterCode,
                      child: const Text(
                        'Enter parcel code manually',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
