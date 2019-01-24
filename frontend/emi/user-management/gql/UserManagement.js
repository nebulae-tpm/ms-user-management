import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

export const getBusinessByFilterText = gql`
  query getBusinessByFilterText($filterText: String, $limit: Int) {
    getBusinessByFilterText(filterText: $filterText, limit: $limit) {
      _id
      generalInfo{
        name
      }
      state
    }
  }
`;

export const getMyBusiness = gql`
  query myBusiness {
    myBusiness {
      _id
      generalInfo{
        name
      }
      state
    }
  }
`;

//Gets the users filtered by page, count and search filter
export const getUsers = gql`
  query getUsers($page: Int!, $count: Int!, $searchFilter: String, $businessId: String) {
    getUsers(page: $page, count: $count, searchFilter: $searchFilter, businessId: $businessId ){
      _id
      generalInfo{
        name
        lastname
        documentType
        documentId
        email
        phone
      }
      auth{
        username
        userKeycloakId
      }
      roles
      state
      businessId
    }
  }
`;

//Gets the users filtered by page, count and search filter
export const getUser = gql`
  query getUser($id: String!, $businessId: String){
    getUser(id: $id, businessId: $businessId){
      _id
      generalInfo{
        name
        lastname
        documentType
        documentId
        email
        phone
      }
      auth{
        username
        userKeycloakId
      }
      roles
      state
      businessId
    }
  }
`;

//Gets the roles that the petitioner user can assign to other users
export const getRoles = gql`
  query getRoles{
    getRoles
  }
`;

//Gets the role mapping of an user
export const getUserRoleMapping = gql`
  query getUserRoleMapping($userId: ID!, $businessId: String!){
    getUserRoleMapping(userId: $userId, businessId: $businessId){
      id
      name
    }
  }
`;

// MUTATIONS
export const addRolesToTheUser = gql`
  mutation addRolesToTheUser($userId: ID!, $input: RolesInput) {
    addRolesToTheUser(userId: $userId, input: $input) {
      code
      message
    }
  }
`;

export const removeRolesFromUser = gql`
  mutation removeRolesFromUser($userId: ID!, $input: RolesInput) {
    removeRolesFromUser(userId: $userId, input: $input) {
      code
      message
    }
  }
`;

export const createUser = gql`
  mutation createUser($businessId: String!, $input: UserInput!) {
    createUser(businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;

export const updateUserGeneralInfo = gql`
  mutation updateUserGeneralInfo($userId: ID!, $input: UserInput!) {
    updateUserGeneralInfo(userId: $userId, input: $input) {
      code
      message
    }
  }
`;

export const updateUserState = gql`
  mutation updateUserState($userId: ID!, $username: String!, $state: Boolean!) {
    updateUserState(userId: $userId, username: $username, state: $state) {
      code
      message
    }
  }
`;

export const createUserAuth = gql`
  mutation createUserAuth($userId: ID!, $username: String!, $input: AuthInput) {
    createUserAuth(userId: $userId, username: $username, input: $input) {
      code
      message
    }
  }
`;

export const removeUserAuth = gql`
  mutation removeUserAuth($userId: ID!) {
    removeUserAuth(userId: $userId) {
      code
      message
    }
  }
`;

export const resetUserPassword = gql`
  mutation resetUserPassword($userId: ID!, $input: UserPasswordInput) {
    resetUserPassword(userId: $userId, input: $input) {
      code
      message
    }
  }
`;
