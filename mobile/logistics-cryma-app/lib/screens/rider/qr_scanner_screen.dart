import 'package:flutter/material.dart';
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
  final MobileScannerController _ctrl = MobileScannerController();
  bool _handled = false;
  bool _analyzing = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  // ── Camera scan ────────────────────────────────────────────────────────────
  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final value = capture.barcodes.firstOrNull?.rawValue;
    if (value == null) return;
    _handled = true;
    _ctrl.stop();
    _handleResult(value);
  }

  // ── Upload from gallery ────────────────────────────────────────────────────
  Future<void> _uploadImage() async {
    if (_handled || _analyzing) return;
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;

    setState(() => _analyzing = true);
    _ctrl.stop();

    final result = await _ctrl.analyzeImage(file.path);

    if (!mounted) return;
    setState(() => _analyzing = false);

    if (result == null || result.barcodes.isEmpty) {
      // No QR found in image
      _showError(
        title: 'Invalid Image',
        message: 'No QR code was detected in the selected image. '
            'Please choose a clear, unobstructed photo of the QR code label.',
        onRetry: () {
          _ctrl.start();
          _uploadImage();
        },
      );
      return;
    }

    final value = result.barcodes.first.rawValue;
    if (value == null) {
      _showError(
        title: 'Invalid Image',
        message: 'The QR code in the image could not be read. '
            'Please use a clearer photo.',
        onRetry: () {
          _ctrl.start();
          _uploadImage();
        },
      );
      return;
    }

    _handled = true;
    _handleResult(value);
  }

  // ── Shared result handler ──────────────────────────────────────────────────
  void _handleResult(String value) {
    if (value == widget.expectedQrCode) {
      Navigator.of(context).pop(true);
    } else {
      _showError(
        title: 'Wrong QR Code',
        message: 'This QR code does not match the order. '
            'Please scan or upload the correct parcel label.',
        onRetry: () {
          setState(() => _handled = false);
          _ctrl.start();
        },
      );
    }
  }

  void _showError({
    required String title,
    required String message,
    required VoidCallback onRetry,
  }) {
    showDialog(
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
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _ctrl.toggleTorch(),
            tooltip: 'Toggle flash',
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera feed
          MobileScanner(controller: _ctrl, onDetect: _onDetect),

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

          // Upload button
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: _analyzing
                  ? const Column(
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
                  : TextButton.icon(
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
            ),
          ),
        ],
      ),
    );
  }
}
