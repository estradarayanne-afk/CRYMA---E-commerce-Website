import 'package:flutter/material.dart';
import '../models/buyer_address.dart';

// ============================================================
// AUTH SCREENS
// ============================================================
import '../screens/onboarding/splash_screen.dart';
import '../screens/onboarding/welcome_screen.dart';
import '../screens/auth/login/login_screen.dart';
import '../screens/auth/login/forgot_password_screen.dart';

// ============================================================
// REGISTER SCREENS
// ============================================================
import '../screens/auth/signup/register_personal_screen.dart';
import '../screens/auth/signup/register_contact_screen.dart';
import '../screens/auth/signup/register_address_screen.dart';
import '../screens/auth/signup/register_id_screen.dart';
import '../screens/auth/signup/register_account_screen.dart';
import '../screens/auth/signup/register_review_screen.dart';
import '../screens/auth/signup/registration_pending_screen.dart';
import '../screens/auth/signup/otp_verification_screen.dart';

// ============================================================
// MAIN APP SCREENS
// ============================================================
import '../screens/catalog/home_screen.dart';
import '../screens/catalog/categories_screen.dart';
import '../screens/catalog/search_screen.dart';
import '../screens/catalog/search_results_screen.dart';
import '../screens/catalog/products_detail_screen.dart';
import '../screens/catalog/storefront_screen.dart';
import '../screens/catalog/all_reviews_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/cart/checkout_screen.dart';
import '../screens/cart/voucher_selection_screen.dart';
import '../screens/cart/order_success_screen.dart';

// ============================================================
// ORDERS SCREENS
// ============================================================
import '../screens/orders/my_orders_screen.dart';
import '../screens/orders/order_details_screen.dart';
import '../screens/orders/order_tracking_screen.dart';
import '../screens/orders/rate_feedback_screen.dart';

// ============================================================
// CHAT SCREENS
// ============================================================
import '../screens/chat/chat_list_screen.dart';
import '../screens/chat/chat_conversation_screen.dart';

// ============================================================
// ACCOUNT SCREENS
// ============================================================
import '../screens/account/account_screen.dart';
import '../screens/account/edit_profile_screen.dart';
import '../screens/account/address_book_screen.dart';
import '../screens/account/add_address_screen.dart';
import '../screens/account/notification_screen.dart';

// BAGONG SCREENS
import '../screens/account/my_reviews_screen.dart';
import '../screens/support/customer_service_screen.dart';
import '../screens/account/wishlist_screen.dart';
import '../screens/account/vouchers_screen.dart';
import '../screens/support/help_center_screen.dart';
import '../screens/support/terms_screen.dart';
import '../screens/support/privacy_screen.dart';
import '../screens/account/change_password_screen.dart';
import '../screens/account/security_settings_screen.dart';
import '../screens/account/payment_methods_screen.dart';
import '../widgets/buyer_auth_guard.dart';

MaterialPageRoute<dynamic> _buyerRoute({
  required RouteSettings settings,
  required Widget child,
  String title = 'Sign in to continue',
  String message = 'Create an account or sign in to use this buyer feature.',
}) {
  return MaterialPageRoute(
    settings: settings,
    builder: (_) => BuyerAuthGuard(
      title: title,
      message: message,
      child: child,
    ),
  );
}

// ============================================================
// APP ROUTER
// ============================================================
class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      // ============================================================
      // AUTH SCREENS
      // ============================================================
      case '/':
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case '/welcome':
        return MaterialPageRoute(builder: (_) => const WelcomeScreen());
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case '/forgot_password':
        return MaterialPageRoute(builder: (_) => const ForgotPasswordScreen());

      // ============================================================
      // REGISTER SCREENS
      // ============================================================
      case '/register_personal':
        return MaterialPageRoute(
            settings: settings, builder: (_) => const RegisterPersonalScreen());
      case '/register_contact':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => RegisterContactScreen(
            personalData: data?['personalData'],
          ),
        );
      case '/register_address':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => RegisterAddressScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
          ),
        );
      case '/register_id':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => RegisterIDScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
            addressData: data?['addressData'],
            password: data?['password'],
            passwordConfirmation: data?['passwordConfirmation'],
          ),
        );
      case '/register_account':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => RegisterAccountScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
            addressData: data?['addressData'],
          ),
        );
      case '/register_review':
        final data = settings.arguments as Map<String, dynamic>? ?? {};
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => RegisterReviewScreen(data: data),
        );
      case '/registration_pending':
        return MaterialPageRoute(
            builder: (_) => const RegistrationPendingScreen());

      // ✅ OTP VERIFICATION SCREEN
      case '/otp_verification':
        final arguments = settings.arguments;
        final data = arguments is Map<String, dynamic>
            ? arguments
            : <String, dynamic>{'email': arguments};
        return MaterialPageRoute(
          builder: (_) => OtpVerificationScreen(
            email: data['email']?.toString(),
            deliveryFailed: data['deliveryFailed'] == true,
            notice: data['notice']?.toString(),
          ),
        );

      // ============================================================
      // MAIN APP SCREENS
      // ============================================================
      case '/home':
        return MaterialPageRoute(builder: (_) => const HomeScreen());
      case '/categories':
        return MaterialPageRoute(builder: (_) => const CategoriesScreen());
      case '/search':
        return MaterialPageRoute(builder: (_) => const SearchScreen());
      case '/search_results':
        final arguments = settings.arguments;
        final query = arguments is String
            ? arguments
            : arguments is Map<String, dynamic>
                ? arguments['search'] as String?
                : null;
        final category = arguments is Map<String, dynamic>
            ? arguments['category'] as String?
            : null;
        return MaterialPageRoute(
          builder: (_) => SearchResultsScreen(
            searchQuery: query,
            category: category,
          ),
        );
      case '/product_detail':
        final productId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => ProductsDetailScreen(productId: productId),
        );
      case '/storefront':
        final slug = settings.arguments as String? ?? '';
        return MaterialPageRoute(builder: (_) => StorefrontScreen(slug: slug));

      // ✅ ALL REVIEWS SCREEN
      case '/all_reviews':
        final productId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => AllReviewsScreen(productId: productId),
        );

      case '/cart':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view your cart',
          message: 'Create an account or sign in to shop on CRYMA.',
          child: const CartScreen(),
        );
      case '/checkout':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to checkout',
          message: 'Sign in to continue to checkout.',
          child: const CheckoutScreen(),
        );
      case '/voucher_selection':
        final items = settings.arguments as List<Map<String, dynamic>>? ?? [];
        return MaterialPageRoute<Map<String, dynamic>>(
          settings: settings,
          builder: (_) => BuyerAuthGuard(
            child: VoucherSelectionScreen(items: items),
          ),
        );
      case '/order_success':
        return _buyerRoute(
          settings: settings,
          child: const OrderSuccessScreen(),
        );

      // ============================================================
      // ORDERS SCREENS
      // ============================================================
      case '/my_orders':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view your orders',
          message: 'Sign in to see order updates and delivery status.',
          child: const MyOrdersScreen(),
        );
      case '/order_details':
        final orderId = settings.arguments as String?;
        return _buyerRoute(
          settings: settings,
          child: OrderDetailsScreen(orderId: orderId),
        );
      case '/order_tracking':
        final orderId = settings.arguments as String?;
        return _buyerRoute(
          settings: settings,
          child: OrderTrackingScreen(orderId: orderId),
        );
      case '/rate_feedback':
        final orderId = settings.arguments as String?;
        return _buyerRoute(
          settings: settings,
          child: RateFeedbackScreen(orderId: orderId),
        );

      // ============================================================
      // CHAT SCREENS
      // ============================================================
      case '/chat_list':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view messages',
          message: 'Sign in to chat with sellers and get help from CRYMA.',
          child: const ChatListScreen(),
        );
      case '/chat_conversation':
        final chatId = settings.arguments as String?;
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to message this seller',
          message: 'Create an account or sign in to contact this seller.',
          child: ChatConversationScreen(chatId: chatId),
        );

      // ============================================================
      // ACCOUNT SCREENS
      // ============================================================
      case '/account':
        return MaterialPageRoute(builder: (_) => const AccountScreen());
      case '/edit_profile':
        return _buyerRoute(
          settings: settings,
          child: const EditProfileScreen(),
        );
      case '/address_book':
        return _buyerRoute(
          settings: settings,
          child: const AddressBookScreen(),
        );
      case '/add_address':
        final address = settings.arguments as BuyerAddress?;
        return MaterialPageRoute<bool>(
          settings: settings,
          builder: (_) => BuyerAuthGuard(
            child: AddAddressScreen(address: address),
          ),
        );
      case '/notification':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view activity',
          message: 'Sign in to see order and delivery updates.',
          child: const NotificationScreen(),
        );

      // BAGONG SCREENS
      case '/my_reviews':
        return _buyerRoute(
          settings: settings,
          child: const MyReviewsScreen(),
        );
      case '/support':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to contact support',
          message: 'Sign in to send a message to our support team.',
          child: const CustomerServiceScreen(),
        );
      case '/wishlist':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view your wishlist',
          message: 'Sign in to see products saved to your wishlist.',
          child: const WishlistScreen(),
        );
      case '/vouchers':
        return _buyerRoute(
          settings: settings,
          title: 'Sign in to view your vouchers',
          message: 'Sign in to see and claim your buyer vouchers.',
          child: const VouchersScreen(),
        );
      case '/help_center':
        return MaterialPageRoute(builder: (_) => const HelpCenterScreen());
      case '/terms':
        return MaterialPageRoute(builder: (_) => const TermsScreen());
      case '/privacy':
        return MaterialPageRoute(builder: (_) => const PrivacyScreen());
      case '/change_password':
        return _buyerRoute(
          settings: settings,
          child: const ChangePasswordScreen(),
        );
      case '/security_settings':
        return _buyerRoute(
          settings: settings,
          child: const SecuritySettingsScreen(),
        );
      case '/payment_methods':
        return _buyerRoute(
          settings: settings,
          child: const PaymentMethodsScreen(),
        );

      // ============================================================
      // FALLBACK
      // ============================================================
      default:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
    }
  }
}
