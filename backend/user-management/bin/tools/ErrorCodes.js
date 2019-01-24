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
const USER_CREDENTIAL_EXIST_ERROR_CODE = {code: 16018, description: 'The user already has an user credentiales'};
const USER_NOT_FOUND_ERROR_CODE = {code: 16019, description: 'The user was not found'};
const USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE = {code: 16020, description: 'The user does not have auth credentials'};
const USER_WAS_NOT_DELETED = {code: 16021, description: 'An error ocurred, user was not deleted'};


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
    INVALID_USER_CREDENTIALS_OR_TOKEN_ERROR_CODE,
    USER_CREDENTIAL_EXIST_ERROR_CODE,
    USER_NOT_FOUND_ERROR_CODE,
    USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE,
    USER_WAS_NOT_DELETED
} 