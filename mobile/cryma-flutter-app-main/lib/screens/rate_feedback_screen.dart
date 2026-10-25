import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../utils/colors.dart';

class RateFeedbackScreen extends StatefulWidget {
  const RateFeedbackScreen({super.key, this.orderId});

  final String? orderId;

  @override
  State<RateFeedbackScreen> createState() => _RateFeedbackScreenState();
}

class _RateFeedbackScreenState extends State<RateFeedbackScreen> {
  int _rating = 4;
  final TextEditingController _reviewController = TextEditingController();
  final List<XFile> _selectedMedia = [];
  final ImagePicker _picker = ImagePicker();

  String _getRatingLabel(int rating) {
    switch (rating) {
      case 1:
        return 'Terrible';
      case 2:
        return 'Poor';
      case 3:
        return 'Okay';
      case 4:
        return 'Great';
      case 5:
        return 'Excellent';
      default:
        return 'Great';
    }
  }

  // ============================================================
  // PICK IMAGE
  // ============================================================
  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );
      if (image != null) {
        setState(() {
          _selectedMedia.add(image);
        });
        _showSnackBar('Photo added!');
      }
    } catch (e) {
      _showSnackBar('Error picking image: $e');
    }
  }

  // ============================================================
  // PICK VIDEO
  // ============================================================
  Future<void> _pickVideo() async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(seconds: 30),
      );
      if (video != null) {
        setState(() {
          _selectedMedia.add(video);
        });
        _showSnackBar('Video added!');
      }
    } catch (e) {
      _showSnackBar('Error picking video: $e');
    }
  }

  // ============================================================
  // SHOW MEDIA OPTIONS (Bottom Sheet)
  // ============================================================
  void _showMediaOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: const BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.lightGray,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Add Media',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.softRose,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.image_outlined,
                      color: AppColors.primary,
                    ),
                  ),
                  title: const Text(
                    'Photo',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  subtitle: const Text(
                    'JPG, PNG — max 5MB',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      color: AppColors.gray,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(sheetContext);
                    _pickImage();
                  },
                ),
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.softRose,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.videocam_outlined,
                      color: AppColors.primary,
                    ),
                  ),
                  title: const Text(
                    'Video',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  subtitle: const Text(
                    'MP4 — max 30 seconds',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      color: AppColors.gray,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(sheetContext);
                    _pickVideo();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ============================================================
  // REMOVE MEDIA
  // ============================================================
  void _removeMedia(int index) {
    setState(() {
      _selectedMedia.removeAt(index);
    });
    _showSnackBar('Media removed');
  }

  // ============================================================
  // SNACKBAR
  // ============================================================
  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontFamily: 'Poppins', fontSize: 13),
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ============================================================
  // SUBMIT REVIEW
  // ============================================================
  void _handleSubmit() {
    if (_reviewController.text.isEmpty && _selectedMedia.isEmpty) {
      _showAlert('Please write a review or add photos/videos.');
      return;
    }
    _showAlert('Review submitted successfully!');
  }

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Review Submitted',
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          message,
          style: const TextStyle(fontFamily: 'Poppins'),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text(
              'OK',
              style: TextStyle(color: AppColors.primary, fontFamily: 'Poppins'),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // BUILD
  // ============================================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 22, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Rate & Review',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),

            // BODY
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  children: [
                    // PRODUCT CARD
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: AppColors.lightGray, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              color: AppColors.lightGray,
                              image: const DecorationImage(
                                image:
                                    AssetImage('assets/image/headphones.jpg'),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Anker Soundcore Q35',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.darkGray,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Black · x1',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.gray,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  '₱2,499',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // RATING CARD
                    Container(
                      padding: const EdgeInsets.symmetric(
                          vertical: 20, horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: AppColors.lightGray, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'How would you rate this product?',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Your review helps other buyers',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.gray,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (index) {
                              final starNumber = index + 1;
                              return GestureDetector(
                                onTap: () =>
                                    setState(() => _rating = starNumber),
                                child: Padding(
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 4),
                                  child: Icon(
                                    starNumber <= _rating
                                        ? Icons.star
                                        : Icons.star_border,
                                    size: 40,
                                    color: starNumber <= _rating
                                        ? const Color(0xFFF5A623)
                                        : AppColors.lightGray,
                                  ),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _getRatingLabel(_rating),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // REVIEW CARD
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: AppColors.lightGray, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Write a review (optional)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F8F8),
                              borderRadius: BorderRadius.circular(10),
                              border:
                                  Border.all(color: const Color(0xFFEEEEEE)),
                            ),
                            child: TextField(
                              controller: _reviewController,
                              maxLines: 4,
                              textAlignVertical: TextAlignVertical.top,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.darkGray,
                                fontFamily: 'Poppins',
                              ),
                              decoration: const InputDecoration(
                                hintText:
                                    'Share your experience with this product...',
                                hintStyle: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFFB0B0B0),
                                  fontFamily: 'Poppins',
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ============================================================
                    // ADD PHOTOS/VIDEOS CARD - CLICKABLE NA!
                    // ============================================================
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: AppColors.lightGray, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Add Photos/Videos (optional)',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                  fontFamily: 'Poppins',
                                ),
                              ),
                              if (_selectedMedia.isNotEmpty)
                                Text(
                                  '${_selectedMedia.length} selected',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.primary,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Media preview grid
                          if (_selectedMedia.isNotEmpty) ...[
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children:
                                  _selectedMedia.asMap().entries.map((entry) {
                                final index = entry.key;
                                final media = entry.value;
                                final isVideo = media.path
                                        .toLowerCase()
                                        .endsWith('.mp4') ||
                                    media.path.toLowerCase().endsWith('.mov');
                                return Stack(
                                  children: [
                                    Container(
                                      width: 80,
                                      height: 80,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                            color: AppColors.lightGray),
                                        image: !isVideo
                                            ? DecorationImage(
                                                image:
                                                    FileImage(File(media.path)),
                                                fit: BoxFit.cover,
                                              )
                                            : null,
                                        color:
                                            isVideo ? AppColors.softRose : null,
                                      ),
                                      child: isVideo
                                          ? const Center(
                                              child: Icon(
                                                Icons.play_circle_outline,
                                                size: 32,
                                                color: AppColors.primary,
                                              ),
                                            )
                                          : null,
                                    ),
                                    Positioned(
                                      top: -4,
                                      right: -4,
                                      child: GestureDetector(
                                        onTap: () => _removeMedia(index),
                                        child: Container(
                                          width: 22,
                                          height: 22,
                                          decoration: const BoxDecoration(
                                            color: AppColors.danger,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(
                                            Icons.close,
                                            size: 14,
                                            color: AppColors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 12),
                          ],

                          // Add media button - CLICKABLE
                          GestureDetector(
                            onTap: _showMediaOptions,
                            child: Container(
                              width: double.infinity,
                              height: 80,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppColors.primary,
                                  width: 1.5,
                                  style: BorderStyle.solid,
                                ),
                                color: AppColors.softRose,
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.add_photo_alternate_outlined,
                                    size: 28,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _selectedMedia.isEmpty
                                        ? 'Add Photo / Video'
                                        : 'Add More',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.primary,
                                      fontFamily: 'Poppins',
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // SUBMIT BUTTON
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Submit Review',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
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
