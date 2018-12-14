export class User{

  id: string;
  username: string;
  generalInfo: {
    name: string;
    lastname: string;
    documentType: string;
    documentId: string;
    email: string;
    phone: string;
  };
  state: boolean;

  constructor(user?){
    user = user || {};
    this.id = user.id;
    this.username = user.username;
    this.state = user.state;
    this.generalInfo = user.generalInfo || {};
  }

}
