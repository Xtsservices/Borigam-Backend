import { invalid } from "joi";


export const commonValidations = {
    collegeName: {
        required: "collegeName is required",
        empty: "collegeName cannot be empty",
        invalid: 'Invalid collegeName',

    },

    address: {
        required: "address is required",
        empty: "address cannot be empty",
        invalid: 'Invalid address',

    },
    
    question: {
        required: "question is required",
        empty: "question cannot be empty",
        invalid: 'Invalid question',

    },
    optionText: {
        required: "optionText is required",
        empty: "optionText cannot be empty",
        invalid: 'Invalid optionText',

    },
    isCorrect: {
        required: "isCorrect is required",
        empty: "isCorrect cannot be empty",
        invalid: 'Invalid isCorrect',

    },
    
    
    firstName: {
        required: "firstName is Required",
        empty: "firstName cannot be empty",
    },
    lastName: {
        required: "lastName is Required",
        empty: "lastName cannot be empty",
    },
    dob:{
        required: "dob is Required",
        empty: "dob cannot be empty",

    },
    education:{
        required: "education is Required",
        empty: "education cannot be empty",

    },
    religion:{
        required: "religion is Required",
        empty: "religion cannot be empty",

    },
    Note:{
        required: "religion is Required",
        empty: "religion cannot be empty",

    },
    gender:{
        required: "gender is Required",
        empty: "gender cannot be empty",

    },
    aadharNumber:{
        required: "aadharNumber is Required",
        empty: "aadharNumber cannot be empty",

    },
    experience:{
        required: "experience is Required",
        empty: "experience cannot be empty",

    },
    endpoint:{
        required: "endpoint is Required",
        empty: "endpoint cannot be empty",

    },
    ServerType:{
        required: "ServerType is Required",
        empty: "ServerType cannot be empty",

    },
    auth:{
        required: "auth is Required",
        empty: "auth cannot be empty",

    },
    p256dh:{
        required: "p256dh is Required",
        empty: "p256dh cannot be empty",
    },
    languages:{
        required: "languages are Required",
        empty: "languages cannot be empty",

    },
    serviceAreaName:{
        required: "serviceAreaName is Required",
        empty: "serviceAreaName cannot be empty"
    },
    partnerID: {
        required: "partnerID is Required",
        empty: "partnerID cannot be empty"
    },
    partnerName: {
        required: "PartnerName is Required",
        empty: "PartnerName cannot be empty"
    },
    createdBy:{
        required: "createdBy is Required",
        empty: "createdBy cannot be empty"
    },
    CreatedPersonName:{
        required: "CreatedPersonName is Required",
        empty: "CreatedPersonName cannot be empty"
    },
    countrycode: {
        required: "country code is Required",
        empty: "country coder cannot be empty",
        invalid: ' invalid mobile number'
    },
    mobileNumber: {
        required: "Mobile Number is Required",
        empty: "mobileNumber cannot be empty",
        invalid: ' invalid mobile number'
    },
    hospitalname: {
        required: "hopital Name is Required",
        empty: "hopital Name cannot be empty",
        invalid: ' invalid hopital Name'
    },
    whatsappnumber: {
        required: "whatsapp number is Required",
        empty: "whatsapp number cannot be empty",
        invalid: ' invalid whatsapp number'
    },
    password:{
        required:"password is required",
        empty: "password cannot be empty",
        invalid: ' invalid password  '
    },
    newpassword:{
        required:"newpassword is required",
        empty: "newpassword cannot be empty",
        invalid: ' invalid newpassword  '
    },
    confirmpassword:{
        required:"confirmpassword is required",
        empty: "confirmpassword cannot be empty",
        invalid: ' invalid confirmpassword  '
    },
   
    type: {
        required: "type is required",
        empty: "type cannot be empty"
    },
    comment: {
        required: "comment is required",
        empty: "comment cannot be empty"
    },
    
    
    customreName: {
        required: "customreName is required",
        empty: "customreName cannot be empty"

    },
    slotId:{
        required: "slotId is required",
        empty: "slotId cannot be empty",
    },
    customerName: {
        required: "customerName is required",
        empty: "customerName cannot be empty"
    },
    appointmentId:{
        required: "appointmentId is required",
        empty: "appointmentId cannot be empty"

    },
    appointmentStatus:{
        required: "appointmentStatus is required",
        empty: "appointmentStatus cannot be empty",
    },
    appointmentDate:{
        required: "appointmentDate is required",
        empty: "appointmentDate cannot be empty"
    },
    appointmentEndTime:{
        required: "appointmentEndTime is required",
        empty: "appointmentEndTime cannot be empty",
    },
    appointmentStartTime:{
        required: "appointmentStartTime is required",
        empty: "appointmentStartTime cannot be empty",
    },
    patientName:{
        required: "patientName is required",
        empty: "patientName cannot be empty",
    },
    doctorType:{
        required: "doctorType is required",
        empty: "doctorType cannot be empty",
    },
    doctorId:{
        required: "doctorId is required",
        empty: "doctorId cannot be empty",
    },
    isLinkPayment:{
        required: "isLinkPayment is required",
        empty: "isLinkPayment cannot be empty",
    },
    age: {
        required: "age is required",
        empty: "age cannot be empty"
    },
    patientId:{
        required: "patientId is required",
        empty: "patientId cannot be empty",
    },
    familyMemberId:{
        required: "familyMemberId is required",
        empty: "familyMemberId cannot be empty",
    },
    relationship:{
        required: "relationship is required",
        empty: "relationship cannot be empty",
    },
    emailID: {
        required: "emailID is Required",
        empty: "emailID cannot be empty",
        invalid: "invalid EmailID",

    },
    confirmPassword: {
        required: "confirmpassword is Required",
        empty: "confirmpassword cannot be empty",
    },
    addressDetails: {
        empty: 'Address details cannot be empty',
        required: 'Address details are required'
    },
    status: {
        required: "status is required",
        empty: "status cannot be empty"
    },
    nurseQualifications:{
        required: "nurseQualifications is required",
        empty: "nurseQualifications cannot be empty"
        
    },
    profileImage: {
        empty: 'Profile image cannot be empty',
        required: 'Profile image  is required',
        // invalid: 'Profile image URL must be a valid URL ending with jpg, jpeg, png'
    },
    aadharCardDoc:{
        required: "aadharCardDoc is required",
        empty: "aadharCardDoc cannot be empty"

    },

    GDAcertified:{
        required: "GDAcertified is required",
        empty: "GDAcertified cannot be empty"
    },
    GDADocument:{
        required: "GDADoc is required",
        empty: "GDADoc cannot be empty"
    },
    nurseDocs:{
        required: "nurseDocs is required",
        empty: "nurseDocs cannot be empty"

    },
    userID: {
        required: "userID is required",
        empty: "userID cannot be empty"
    },
    requestID: {
        required: "requestID is required",
        empty: "requestID cannot be empty"
    },
    businessNature: {
        required: "businessNature is required",
        empty: "businessNature cannot be empty"
    },
    businessStartDate: {
        required: "businessStartDate is required",
        empty: "businessStartDate cannot be empty"
    },
    totalStaffMembers: {
        required: "totalStaffMembers is required",
        empty: "totalStaffMembers cannot be empty"
    },
    PANNumber: {
        required: "PANNumber is required",
        empty: "PANNumber cannot be empty"
    },
    role: {
        required: "role is required",
        empty: "role cannot be empty",
        invalid: 'Invalid role',

    },
    course: {
        required: "course is required",
        empty: "course cannot be empty",
        invalid: 'Invalid course',

    },
    OTP: {
        required: "OTP is required",
        empty: "OTP cannot be empty"
    },

    module: {
        required: "module is required",
        empty: "module cannot be empty"
    },
    roleID: {
        required: "roleID is required",
        empty: "roleID cannot be empty"
    },
    privilege: {
        required: "privilege is required",
        empty: "privilege cannot be empty"
    },
    GSTNumber: {
        required: "GSTNumber is required",
        empty: "GSTNumber cannot be empty"
    },
    partnerType: {
        required: "partnerType is required",
        empty: "partnerType cannot be empty"
    },
    pinCode: {
        required: "pinCode is required",
        empty: "pinCode cannot be empty",
        invalid:' invalid pincode number'

    },
    streetAddress: {
        required: "streetAddress is required",
        empty: "streetAddress cannot be empty"
    },
    landMark: {
        required: "landMark is required",
        empty: "landMark cannot be empty"
    },
    city: {
        required: "city is required",
        empty: "city cannot be empty"
    },
    state: {
        required: "state is required",
        empty: "state cannot be empty"
    },
    country: {
        required: "state is required",
        empty: "state cannot be empty"
    },
    pointOfContact: {
        required: "pointOfContact is required",
        empty: "pointOfContact cannot be empty"
    },
    contactName: {
        required: "contactName is required",
        empty: "contactName cannot be empty"
    },
    contactNo: {
        required: "contactName is required",
        empty: "contactName cannot be empty"
    },
    userOtpID: {
        required: "userOtpID is required",
        empty: "userOtpID cannot be empty"
    },

    bankName: {
        required: "bankName is required",
        empty: "bankName cannot be empty"
    },
    branch: {
        required: "branch is required",
        empty: "branch cannot be empty"
    },
    bankAccountNumber: {
        required: "bankAccountNumber is required",
        empty: "bankAccountNumber cannot be empty"
    },
    bankAccountHolderName: {
        required: "bankAccountHolderName is required",
        empty: "bankAccountHolderName cannot be empty"
    },
    IFSCCode: {
        required: "IFSCCode is required",
        empty: "IFSCCode cannot be empty"
    },
    accountType: {
        required: "accountType is required",
        empty: "accountType cannot be empty"
    },
    servicearray: {
        required: "servicearray is required",
        empty: "servicearray cannot be empty"
    },
    serviceName: {
        required: "servicename is required",
        empty: "servicename cannot be empty"
    },
    serviceID: {
        required: "serviceID is required",
        empty: "serviceID cannot be empty"
    },
    cityName: {
        required: "cityName is required",
        empty: "cityName cannot be empty"
    },
    serviceTypes: {
        required: "serviceTypes is required",
        empty: "serviceTypes cannot be empty",
        invalid: "Invalid serviceTypes"
    },
    areaOfOperations: {
        required: "areaOfOperations is required",
        empty: "areaOfOperations cannot be empty"
    },
   
    attachmentID: {
        required: "attachmentID is required",
        empty: "attachmentID cannot be empty"
    },

    totalAmbulances: {
        required: "totalAmbulances is required",
        empty: "totalAmbulances cannot be empty"
    },

    totalDrivers: {
        required: "totalDrivers is required",
        empty: "totalDrivers cannot be empty"
    },
    ambulanceAndDriverDetails: {
        required: "ambulanceAndDriverDetails is required",
        empty: "ambulanceAndDriverDetails cannot be empty"
    },
    startDate:{
        required:"startDate is required",
        empty:"startDate cannot be empty"
    },
    endDate:{
        required:"endDate is required",
        empty:"endDate cannot be empty"
    },
    cityID:{
        required:"cityID is required",
        empty:"cityID cannot be empty"
    },
    categoryID:{
        required:"categoryID is required",
        empty:"categoryID cannot be empty"
    },
    subCategoryID:{
        required:"subCategoryID is required",
        empty:"subCategoryID cannot be empty"
    },
    subSubCategoryID:{
        required:"subSubCategoryID is required",
        empty:"subSubCategoryID cannot be empty"
    },
    vendorPrice:{
        required:"vendorPrice is required",
        empty:"vendor cannot be empty"
    },
    minimumPrice:{
        required:"minimumPrice is required",
        empty:"minimumPrice cannot be empty"
    },
    tarrifType:{
        required:"tarrifType is required",
        empty:"tarrifType cannot be empty"
    },
    referralType:{
        required:"referalType is required",
        empty:"referalType cannot be empty"
    },
    referralFee:{
        required:"referralFee is required",
        empty:"referralFee cannot be empty"
    },
    finalPrice:{
        required:"finalPrice is required",
        empty:"finalPrice cannot be empty"
    },
    paymentID: {
        required: "paymentID is required",
        empty: "paymentID cannot be empty"
    },
    reason: {
        required: "reason is required",
        empty: "reason cannot be empty"
    },


    SelectedProfiles: {
        required: "SelectedProfiles is required",
        unknown: "SelectedProfiles should only include strings",
        base: "SelectedProfiles should ne in array"
    },
    isInvoiceAvailable: {
        required: "isInvoiceAvailable is required",
        empty: "isInvoiceAvailable cannot be empty"
    },
    invoiceID: {
        required: "invoiceID is required",
        empty: "invoiceID cannot be empty"
    },

    invoiceDate: {
        required: "invoiceDate is required",
        empty: "invoiceDate cannot be empty"
    },

    
    pageLimit: {
        required: "pageLimit is required",
        empty: "pageLimit cannot be empty"
    },

    pageNumber: {
        required: "pageNumber is required",
        empty: "pageNumber cannot be empty"
    },

    pageSize: {
        required: "pageSize is required",
        empty: "pageSize cannot be empty"
    },
    contractID: {
        required: "contractID is required",
        empty: "contractID cannot be empty"
    },
    id: {
        required: "id is required",
        empty: "id cannot be empty"
    },
    comments:{
        required: "comments is required",
        empty: "comments cannot be empty"
    },
    aliasName: {
        required: "aliasName is required",
        empty: "aliasName cannot be empty"
    },
    rating: {
        required: "rating is required",
        empty: "rating cannot be empty"
    },
    staffID: {
        required: "staffID is required",
        empty: "staffID cannot be empty"
    },
    staffName: {
        required: "StaffNamety is required",
        empty: "cstaffName cannot be empty"
    },
    area: {
        required: "area is required",
        empty: "area cannot be empty"
    },
    eloc: {
        required: "eloc is required",
        empty: "eloc cannot be empty"
    },
    latitude: {
        required: "latitude is required",
        empty: "latitude cannot be empty"
    },
    longitude: {
        required: "longitude is required",
        empty: "longitude cannot be empty"
    },
    collectiondate: {
        required: "collection date is required",
        empty: "collection date cannot be empty"
    },
    bookingdate: {
        required: "booking  date is required",
        empty: "booking date cannot be empty"
    },

    testdata: {
        required: "Tests is required",
        empty: "Tests cannot be empty"
    },

    timeslot: {
        required: "Time Slot  is required",
        empty: "Time Slot cannot be empty"
    },
    CustRecID: {
        required: "CustRecID  is required",
        empty: "CustRecID cannot be empty"
    },

    packagecodes: {
        required: "package code  is required",
        empty: "package code cannot be empty"
    },
    additionalmember: {
        required: "additional member  is required",
        empty: "additional member cannot be empty"
    },
    bookingID: {
        required: "bookingID  is required",
        empty: "bookingID cannot be empty"
    },
    url_link: {
        required: "url_link  is required",
        empty: "url_link cannot be empty"
    },
    hook_type_list: {
        required: "hook_type_list  is required",
        empty: "hook_type_list cannot be empty"
    },
    webhook_type: {
        required: "webhook_type  is required",
        empty: "webhook_type cannot be empty"
    },
    note:{
        required:"note is required",
        empty:"note is required"
    }

    


    
    

}

