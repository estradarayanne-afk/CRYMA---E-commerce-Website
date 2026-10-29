import 'package:flutter/material.dart';

// ============================================================
// AUTH SCREENS
// ============================================================
import '../screens/splash_screen.dart';
import '../screens/welcome_screen.dart';
import '../screens/login_screen.dart';
import '../screens/forgot_password_screen.dart';

// ============================================================
// REGISTER SCREENS
// ============================================================
import '../screens/register_personal_screen.dart';
import '../screens/register_contact_screen.dart';
import '../screens/register_address_screen.dart';
import '../screens/register_id_screen.dart';
import '../screens/register_account_screen.dart';
import '../screens/registration_pending_screen.dart';
import '../screens/otp_verification_screen.dart';

// ============================================================
// MAIN APP SCREENS
// ============================================================
import '../screens/home_screen.dart';
import '../screens/categories_screen.dart';
import '../screens/search_screen.dart';
import '../screens/search_results_screen.dart';
import '../screens/products_detail_screen.dart';
import '../screens/all_reviews_screen.dart'; // ✅ BAGO
import '../screens/cart_screen.dart';
import '../screens/checkout_screen.dart';
import '../screens/voucher_selection_screen.dart';
import '../screens/payment_method_screen.dart';
import '../screens/order_success_screen.dart';

// ============================================================
// ORDERS SCREENS
// ============================================================
import '../screens/my_orders_screen.dart';
import '../screens/order_details_screen.dart';
import '../screens/order_tracking_screen.dart';
import '../screens/rate_feedback_screen.dart';

// ============================================================
// CHAT SCREENS
// ============================================================
import '../screens/chat_list_screen.dart';
import '../screens/chat_conversation_screen.dart';

// ============================================================
// ACCOUNT SCREENS
// ============================================================
import '../screens/account_screen.dart';
import '../screens/edit_profile_screen.dart';
import '../screens/address_book_screen.dart';
import '../screens/add_address_screen.dart';
import '../screens/notification_screen.dart';
import '../screens/logout_confirmation_screen.dart';

// BAGONG SCREENS
import '../screens/my_reviews_screen.dart';
import '../screens/customer_service_screen.dart';
import '../screens/wishlist_screen.dart';
import '../screens/vouchers_screen.dart';
import '../screens/help_center_screen.dart';
import '../screens/terms_screen.dart';
import '../screens/privacy_screen.dart';
import '../screens/change_password_screen.dart';
import '../screens/security_settings_screen.dart';
import '../screens/payment_methods_screen.dart';

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
            builder: (_) => const RegisterPersonalScreen());
      case '/register_contact':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => RegisterContactScreen(
            personalData: data?['personalData'],
          ),
        );
      case '/register_address':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => RegisterAddressScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
          ),
        );
      case '/register_id':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => RegisterIDScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
            addressData: data?['addressData'],
          ),
        );
      case '/register_account':
        final data = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => RegisterAccountScreen(
            personalData: data?['personalData'],
            contactData: data?['contactData'],
            addressData: data?['addressData'],
            idFile: data?['idFile'],
          ),
        );
      case '/registration_pending':
        return MaterialPageRoute(
            builder: (_) => const RegistrationPendingScreen());

      // ✅ OTP VERIFICATION SCREEN
      case '/otp_verification':
        final email = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => OtpVerificationScreen(email: email),
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

      // ✅ ALL REVIEWS SCREEN
      case '/all_reviews':
        final productId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => AllReviewsScreen(productId: productId),
        );

      case '/cart':
        return MaterialPageRoute(builder: (_) => const CartScreen());
      case '/checkout':
        return MaterialPageRoute(builder: (_) => const CheckoutScreen());
      case '/voucher_selection':
        return MaterialPageRoute(
            builder: (_) => const VoucherSelectionScreen());
      case '/payment_method':
        return MaterialPageRoute(builder: (_) => const PaymentMethodScreen());
      case '/order_success':
        return MaterialPageRoute(builder: (_) => const OrderSuccessScreen());

      // ============================================================
      // ORDERS SCREENS
      // ============================================================
      case '/my_orders':
        return MaterialPageRoute(builder: (_) => const MyOrdersScreen());
      case '/order_details':
        final orderId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => OrderDetailsScreen(orderId: orderId),
        );
      case '/order_tracking':
        final orderId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => OrderTrackingScreen(orderId: orderId),
        );
      case '/rate_feedback':
        final orderId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => RateFeedbackScreen(orderId: orderId),
        );

      // ============================================================
      // CHAT SCREENS
      // ============================================================
      case '/chat_list':
        return MaterialPageRoute(builder: (_) => const ChatListScreen());
      case '/chat_conversation':
        final chatId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => ChatConversationScreen(chatId: chatId),
        );

      // ============================================================
      // ACCOUNT SCREENS
      // ============================================================
      case '/account':
        return MaterialPageRoute(builder: (_) => const AccountScreen());
      case '/edit_profile':
        return MaterialPageRoute(builder: (_) => const EditProfileScreen());
      case '/address_book':
        return MaterialPageRoute(builder: (_) => const AddressBookScreen());
      case '/add_address':
        return MaterialPageRoute(builder: (_) => const AddAddressScreen());
      case '/notification':
        return MaterialPageRoute(builder: (_) => const NotificationScreen());
      case '/logout_confirmation':
        return MaterialPageRoute(
          builder: (_) => const LogoutConfirmationScreen(),
        );

      // BAGONG SCREENS
      case '/my_reviews':
        return MaterialPageRoute(builder: (_) => const MyReviewsScreen());
      case '/support':
        return MaterialPageRoute(builder: (_) => const CustomerServiceScreen());
      case '/wishlist':
        return MaterialPageRoute(builder: (_) => const WishlistScreen());
      case '/vouchers':
        return MaterialPageRoute(builder: (_) => const VouchersScreen());
      case '/help_center':
        return MaterialPageRoute(builder: (_) => const HelpCenterScreen());
      case '/terms':
        return MaterialPageRoute(builder: (_) => const TermsScreen());
      case '/privacy':
        return MaterialPageRoute(builder: (_) => const PrivacyScreen());
      case '/change_password':
        return MaterialPageRoute(builder: (_) => const ChangePasswordScreen());
      case '/security_settings':
        return MaterialPageRoute(
            builder: (_) => const SecuritySettingsScreen());
      case '/payment_methods':
        return MaterialPageRoute(builder: (_) => const PaymentMethodsScreen());

      // ============================================================
      // FALLBACK
      // ============================================================
      default:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
    }
  }
}
