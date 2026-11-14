class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final ApiError? error;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.error,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) dataFromJson,
  ) {
    return ApiResponse(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null ? dataFromJson(json['data']) : null,
      message: json['message'] as String?,
      error: json['error'] != null
          ? ApiError.fromJson(json['error'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson(Map<String, dynamic> Function(T) dataToJson) {
    return {
      'success': success,
      'data': data != null ? dataToJson(data as T) : null,
      'message': message,
      'error': error?.toJson(),
    };
  }
}

class ApiError {
  final String? code;
  final String message;
  final Map<String, dynamic>? details;

  ApiError({
    this.code,
    required this.message,
    this.details,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      code: json['code'] as String?,
      message: json['message'] as String? ?? 'An error occurred',
      details: json['details'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'message': message,
      'details': details,
    };
  }

  @override
  String toString() => 'ApiError(code: $code, message: $message)';
}

class LoginResponse {
  final String token;
  final int expiresIn;
  final Map<String, dynamic> user;

  LoginResponse({
    required this.token,
    required this.expiresIn,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] as String? ?? '',
      expiresIn: json['expiresIn'] as int? ?? 86400,
      user: json['user'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'expiresIn': expiresIn,
      'user': user,
    };
  }
}

class RegisterResponse {
  final String message;
  final String riderId;
  final String accountStatus;

  RegisterResponse({
    required this.message,
    required this.riderId,
    required this.accountStatus,
  });

  factory RegisterResponse.fromJson(Map<String, dynamic> json) {
    return RegisterResponse(
      message: json['message'] as String? ?? '',
      riderId: json['riderId'] as String? ?? '',
      accountStatus: json['accountStatus'] as String? ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'message': message,
      'riderId': riderId,
      'accountStatus': accountStatus,
    };
  }
}

class AccountStatusResponse {
  final String status; // pending, active, rejected
  final String? rejectionReason;

  AccountStatusResponse({
    required this.status,
    this.rejectionReason,
  });

  factory AccountStatusResponse.fromJson(Map<String, dynamic> json) {
    return AccountStatusResponse(
      status: json['status'] as String? ?? 'pending',
      rejectionReason: json['rejectionReason'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'rejectionReason': rejectionReason,
    };
  }
}
