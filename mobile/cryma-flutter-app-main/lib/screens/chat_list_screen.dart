import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// CHAT MODEL
// ============================================================
class Chat {
  final String id;
  final String name;
  final String message;
  final String time;
  final int unread;
  final String imagePath;

  const Chat({
    required this.id,
    required this.name,
    required this.message,
    required this.time,
    this.unread = 0,
    required this.imagePath,
  });
}

// ============================================================
// CHAT LIST SCREEN
// ============================================================
class ChatListScreen extends StatelessWidget {
  ChatListScreen({super.key});

  final List<Chat> _chats = const [
    Chat(
      id: '1',
      name: 'TechZone PH',
      message: 'Your order has been shipped!',
      time: '2m ago',
      unread: 2,
      imagePath: 'assets/image/techzoneph.jpg',
    ),
    Chat(
      id: '2',
      name: 'Belle Beauty Hub',
      message: 'Hi! Is this still available?',
      time: '1h ago',
      unread: 0,
      imagePath: 'assets/image/belle_beautyhub.jpg',
    ),
    Chat(
      id: '3',
      name: 'Home Essentials PH',
      message: 'Thank you for your order 😊',
      time: 'Yesterday',
      unread: 0,
      imagePath: 'assets/image/home_essential.jpg',
    ),
    Chat(
      id: '4',
      name: "Juan's Sports Store",
      message: 'We have that in blue! Would you...',
      time: 'Mon',
      unread: 1,
      imagePath: 'assets/image/juans_sport_store.jpg',
    ),
    Chat(
      id: '5',
      name: 'Fashion Forward MNL',
      message: 'Your return has been approved.',
      time: 'Sun',
      unread: 0,
      imagePath: 'assets/image/fashion-forward-mnl.jpg',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER - may back arrow na
            // ============================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  // ✅ BACK ARROW
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 22, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  // TITLE
                  const Text(
                    'Messages',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),

            // SEARCH BAR
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.search, size: 16, color: AppColors.gray),
                  SizedBox(width: 6),
                  Expanded(
                    child: TextField(
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search conversations...',
                        hintStyle: TextStyle(
                          fontSize: 12,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // CHAT LIST
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _chats.length,
                itemBuilder: (context, index) {
                  final chat = _chats[index];
                  return _buildChatItem(context, chat);
                },
              ),
            ),

            // BOTTOM NAVIGATION
            _buildBottomNav(),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // CHAT ITEM
  // ============================================================
  Widget _buildChatItem(BuildContext context, Chat chat) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/chat_conversation',
          arguments: chat.id,
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.lightGray,
                image: DecorationImage(
                  image: AssetImage(chat.imagePath),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        chat.name,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      Text(
                        chat.time,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          chat.message,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                      if (chat.unread > 0) ...[
                        const SizedBox(width: 4),
                        Container(
                          width: 18,
                          height: 18,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${chat.unread}',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: AppColors.white,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // BOTTOM NAVIGATION
  // ============================================================
  Widget _buildBottomNav() {
    return Container(
      height: 60,
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFE8E8E8), width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(Icons.home_outlined, 'Home', false),
          _buildNavItem(Icons.grid_view_outlined, 'Categories', false),
          _buildNavItem(Icons.shopping_cart_outlined, 'Cart', false),
          _buildNavItem(Icons.list_alt_outlined, 'Orders', false),
          _buildNavItem(Icons.person_outlined, 'Account', false),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isActive) {
    return GestureDetector(
      onTap: () {
        // Navigate to respective screen
      },
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 22,
            color: isActive ? AppColors.primary : AppColors.gray,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              color: isActive ? AppColors.primary : AppColors.gray,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }
}
