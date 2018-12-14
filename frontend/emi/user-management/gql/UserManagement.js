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
  query getUsers($page: Int!, $count: Int!, $searchFilter: String, $businessId: String!){
    getUsers(page: $page, count: $count, searchFilter: $searchFilter, businessId: $businessId){
      id
      username
      generalInfo{
        name
        lastname
        documentType
        documentId
        email
        phone
      }
      state
    }
  }
`;

//Gets the users filtered by page, count and search filter
export const getUser = gql`
  query getUser($username: String!, $businessId: String!){
    getUser(username: $username, businessId: $businessId){
      id
      username
      generalInfo{
        name
        lastname
        documentType
        documentId
        email
        phone
      }
      state
    }
  }
`;

//Gets the roles that the petitioner user can assign to other users
export const getRoles = gql`
  query getRoles{
    getRoles{
      id
      name
    }
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
  mutation addRolesToTheUser($userId: ID!, $businessId: String!, $input: RolesInput) {
    addRolesToTheUser(userId: $userId, businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;

export const removeRolesFromUser = gql`
  mutation removeRolesFromUser($userId: ID!, $businessId: String!, $input: RolesInput) {
    removeRolesFromUser(userId: $userId, businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;

export const createUser = gql`
  mutation createUser($businessId: String!, $input: UserInput) {
    createUser(businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;

export const updateUserGeneralInfo = gql`
  mutation updateUserGeneralInfo($userId: ID!, $businessId: String!, $input: UserInput) {
    updateUserGeneralInfo(userId: $userId, businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;

export const updateUserState = gql`
  mutation updateUserState($userId: ID!, $businessId: String!, $username: String!, $state: Boolean!) {
    updateUserState(userId: $userId, businessId: $businessId, username: $username, state: $state) {
      code
      message
    }
  }
`;

export const resetUserPassword = gql`
  mutation resetUserPassword($userId: ID!, $businessId: String!, $input: UserPasswordInput) {
    resetUserPassword(userId: $userId, businessId: $businessId, input: $input) {
      code
      message
    }
  }
`;
