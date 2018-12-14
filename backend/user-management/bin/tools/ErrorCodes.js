//Every single error code
// please use the prefix assigned to this microservice
const INTERNAL_SERVER_ERROR_CODE = {code: 16001, description: 'Internal server error'};
const PERMISSION_DENIED_ERROR_CODE = {code: 16002, description: 'Permission denied'};
const USER_MISSING_DATA_ERROR_CODE = {code: 16010, description: 'User missing data'};
const USER_NAME_ALREADY_USED_CODE = {code: 16011, description: 'Username already used'};
const INVALID_USERNAME_FORMAT_ERROR_CODE = {code: 16012, description: 'Invalid username format'};
const MISSING_BUSINESS_ERROR_CODE = {code: 16013, description: 'Missing business id'};
const EMAIL_ALREADY_USED_ERROR_CODE = {code: 16014, description: 'Email already used'};
const USER_UPDATE_OWN_INFO_ERROR_CODE = {code: 16015, description: 'You cannot update your own info'};
const USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE = {code: 16016, description: 'User belongs to other business'};
const INVALID_USER_CREDENTIALS_OR_TOKEN_ERROR_CODE = {code: 16017, description: 'Invalid user credentials or token'};


module.exports =  { 
    USER_MISSING_DATA_ERROR_CODE,
    USER_NAME_ALREADY_USED_CODE,
    EMAIL_ALREADY_USED_ERROR_CODE,
    PERMISSION_DENIED_ERROR_CODE,
    INTERNAL_SERVER_ERROR_CODE,
    INVALID_USERNAME_FORMAT_ERROR_CODE,
    MISSING_BUSINESS_ERROR_CODE,
    USER_UPDATE_OWN_INFO_ERROR_CODE,
    USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
    INVALID_USER_CREDENTIALS_OR_TOKEN_ERROR_CODE
} 