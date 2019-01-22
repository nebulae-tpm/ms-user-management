export class User{

  _id: string;
  generalInfo: {
    name: string;
    lastname: string;
    documentType: string;
    documentId: string;
    email: string;
    phone: string;
  };
  auth: {
    username: string,
    userKeycloakId: string
  };
  businessId: string;
  roles: string[];
  state: boolean;

  constructor(user?){
    user = user || {};
    this._id = user._id;
    this.auth = user.auth || {};
    this.state = user.state;
    this.generalInfo = user.generalInfo || {};
    this.roles = user.roles || [];
  }

}
