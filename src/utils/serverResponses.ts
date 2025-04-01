

export const serverResponseCodes = {
    Error: 500,
    Invalid_Parameters: 400,
    Unauthorized: 401,
    Permissions_Denied: 403,
    NoData: 404,
    AlreadyExist: 202,
    Success: 200,
    AcessToken: 440
  }
  export const dateformate = 'DD-MM-YYYY hh:mm A'
  
  
  
  export const responseMessage = {
  
    user_exists: "User Already Exists Please SignIn",
    success: "Successfully executed the request.",
    update_success: "Successfully updated",
    join_us: "Please Join us Initially in our Website",
    unauthorised: 'You are not authorised to perform this action.',
    permission_denied: "Permission denied for this operation.",
    no_data: "No data found.",
    invalid_parameters: "Invalid parameters provided.",
    internal_server_error: "Internal server error occured.",
    gateway_timeout: "Gateway timeout.",
    error: "Something went wrong.",
    already_exist: "Data already exist.",
    empty_body: "Body should not be empty",
    user_not_exists: "User not exists with this email",
    user_verified: "User verified",
    login_successfully: "Logged In Successfully",
    invalid_date: "Invalid Date Format",
    mobile_number_exist: "Mobile Number is Registered with Another Partner",
    invalid_otp: "Please Enter Valid OTP",
    verify_otp: "OTP Verified Successfully",
    otp_sent: "OTP has been Sent to your Mobile Number",
    user_not_found: "User Not Found",
    user_bank_details_not_found: 'User bank details not found',
    blocked_user: "User Blocked",
    bank_passbook_file_not_found: "Bank passbook file is missing",
    bank_details_exist: "Bank details already exist",
    no_pending_approval_data: "No pending approval data is available.",
    contract_exists: "Contract Already Exists",
    date_invalid: "End Date should be greater than Start Date",
    password_mismatch: "Password Mismatch",
    pending_partner_approval: "Pending Partner Approval",
    comments_required:'Comments are required',
    finane_approval:"Finance Approval Pending",
    price_shouldbe_greater:'Minimum Price should be greater than vendor price',
    password:"New password must be different from the current password"
  
  }