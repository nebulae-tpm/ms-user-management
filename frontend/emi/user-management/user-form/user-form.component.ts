import { UserManagementService } from './../user-management.service';
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";
import { TranslateService } from "@ngx-translate/core";
import { Component, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";
import { MatSnackBar } from "@angular/material";
import { User } from "./../model/user.model";
import { UserFormService } from "./user-form.service";
import { ToolbarService } from "../../../toolbar/toolbar.service";

////////// RXJS ///////////
// tslint:disable-next-line:import-blacklist
import * as Rx from "rxjs/Rx";
import { of, from, Subject, Observable} from "rxjs";
import { takeUntil, first, filter, tap, mergeMap, map, toArray, take, debounceTime } from "rxjs/operators";

@Component({
  selector: "app-user-form",
  templateUrl: "./user-form.component.html",
  styleUrls: ["./user-form.component.scss"]
})
export class UserFormComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();
  // User data
  user = new User();
  pageType: string;
  userGeneralInfoForm: FormGroup;
  userAuthForm: FormGroup;
  userRolesForm: FormGroup;
  userStateForm: FormGroup;
  selectedRoles: any;
  selectedUserRoles: any;
  roles = [];
  userRoles = [];

  paramBusinessId: any;
  paramId: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private userFormService: UserFormService,
    private userManagementService: UserManagementService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private toolbarService: ToolbarService,
    private router: Router,
    private activatedRouter: ActivatedRoute
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    // this.user = new User(this.router.snapshot.data.data ? this.router.snapshot.data.data.data.getUser : undefined);
    this.pageType = this.user._id ? 'edit' : 'new';
    this.userGeneralInfoForm = this.createUserGeneralInfoForm();
    this.userAuthForm = this.createUserAuthForm();
    this.userStateForm = this.createUserStateForm();
    this.userRolesForm = this.createUserRolesForm();
    //this.refreshRoles();
    this.findUser();
    
  }

  getBusinessFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.userManagementService.getBusinessByFilter(filterText, limit).pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(resp => !resp.errors),
      mergeMap(result => from(result.data.getBusinessByFilterText)),
      takeUntil(this.ngUnsubscribe)
    );
  }

  findUser() {
    this.activatedRouter.params
      .pipe(
        mergeMap(params => {
          return this.toolbarService.onSelectedBusiness$
          .pipe(
            debounceTime(500),
            take(1),
            mergeMap(business => {
              return of({...params, businessId: business.id});
            })
          )

        }),
        mergeMap((params: any) => {
          if(params.id === "new"){
            return Rx.Observable.of([undefined, params.businessId, params.username]);
          }else{
            return this.userFormService.getUser$(params.id)
            .pipe(
              map(userData => [userData, params.businessId, params.id])
            );
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(([userData, businessId, id]) => {
        this.paramBusinessId = businessId;
        this.paramId = id;
        this.user = new User(
          userData
            ? userData.data.getUser
            : undefined
        );
        this.pageType = this.user._id ? "edit" : "new";

        this.userGeneralInfoForm = this.createUserGeneralInfoForm();
        this.userAuthForm = this.createUserAuthForm();
        this.userStateForm = this.createUserStateForm();
        this.userRolesForm = this.createUserRolesForm();
        //this.loadRoles();

        this.refreshRoles();
      });
  }

  /**
   * Creates the user general info reactive form
   */
  createUserGeneralInfoForm() {
    return this.formBuilder.group({
      name: [
        this.user.generalInfo ? this.user.generalInfo.name : "",
        Validators.required
      ],
      lastname: [
        this.user.generalInfo ? this.user.generalInfo.lastname : "",
        Validators.required
      ],
      documentType: [
        this.user.generalInfo ? this.user.generalInfo.documentType : "",
        Validators.required
      ],
      documentId: [
        this.user.generalInfo ? this.user.generalInfo.documentId : "",
        Validators.required
      ],
      email: [
        this.user.generalInfo ? this.user.generalInfo.email : "",
        Validators.email
      ],
      phone: [this.user.generalInfo ? this.user.generalInfo.phone : "", Validators.required]
    });
  }

  /**
   * Creates the user state reactive form
   */
  createUserStateForm() {
    return this.formBuilder.group({
      state: [this.user.state]
    });
  }

  /**
   * Creates the user auth reactive form
   */
  createUserAuthForm() {
    return this.formBuilder.group(
      {
        username: [
        {
          value: this.user.auth ? this.user.auth.username: '',
          disabled: (this.pageType != "new" && this.user.auth && this.user.auth.username)
        },
        Validators.compose([
          Validators.required,
          Validators.pattern("^[a-zA-Z0-9._-]{8,}$")
        ])
      ],
        password: [
          "",
          Validators.compose([
            Validators.required,
            Validators.pattern(
              "^(?=[a-zA-Z0-9.]{8,}$)(?=.*?[a-z])(?=.*?[0-9]).*"
            )
          ])
        ],
        passwordConfirmation: ["", Validators.required],
        temporary: [false, Validators.required]
      },
      {
        validator: this.checkIfMatchingPasswords(
          "password",
          "passwordConfirmation"
        )
      }
    );
  }

  /**
   * Creates the user roles reactive form
   */
  createUserRolesForm() {    
    const rolesForm = new FormGroup({
      roles : new FormArray([])
    });

    return rolesForm;    
  }

   /**
   * Navigates to the user detail page of the selected user
   */
  goToUserDetail() {
      setTimeout(() => {
        this.router.navigate(['user-management/'] , { queryParams: {}})
      }, 1000);
  }

  /**
   * Checks if the passwords match, otherwise the form will be invalid.
   * @param passwordKey new Password
   * @param passwordConfirmationKey Confirmation of the new password
   */
  checkIfMatchingPasswords(
    passwordKey: string,
    passwordConfirmationKey: string
  ) {
    return (group: FormGroup) => {
      let passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({ notEquivalent: true });
      } else {
        return passwordConfirmationInput.setErrors(null);
      }
    };
  }

  /**
   * Creates a new user according to the info entered into the form
   */
  createUser() {
    const data: any = {};
    data.generalInfo = this.userGeneralInfoForm.getRawValue();
    data.state = this.userStateForm.getRawValue().state;
    this.userFormService
      .createUser$(data, this.paramBusinessId)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("El usuario ha sido creada", "Cerrar", {
            duration: 2000
          });
          this.goToUserDetail();
          //this.businessCreated.emit(this.selectedBusiness);
        },
        error => {
          console.log("Error creando usuario => ", error);
        }
      );
  }

  /**
   * Updates the user general info according to the info entered into the form
   */
  updateUserGeneralInfo() {
    const data:any = {};
    data.generalInfo = this.userGeneralInfoForm.getRawValue();

    this.userFormService
      .updateUserGeneralInfo$(this.user._id, data)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("El usuario ha sido actualizado", "Cerrar", {
            duration: 2000
          });
        },
        error => {
          console.log("Error updating user general info => ", error);
        }
      );
  }

  /**
   * Loads the roles that the petitioner user can assign to other users
   */
  loadRoles$() {
    return this.userFormService
      .getRoles$()
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        map(roles => roles.data.getRoles),
        takeUntil(this.ngUnsubscribe)
      );
  }

  loadRoles1() {
    this.userFormService
      .getRoles$()
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(roles => {
        this.roles = roles.data.getRoles;
      });
  }

  /**
   * Refresh roles
   */
  refreshRoles() {
    if (this.pageType == "new") {
      return;
    }
    this.loadRoles$()
    .pipe(
      map(roles => [roles, this.user.roles]), 
      takeUntil(this.ngUnsubscribe)     
    )
    .subscribe(([roles, userRoles]) => {
      roles.forEach(role => {          
        (this.userRolesForm.get('roles') as FormArray).push(
          new FormGroup({
            key: new FormControl(role),
            active: new FormControl(userRoles.includes(role))
          })
        );
      });
    });
  }

  removeRoles(roles) {
    for (var i = 0; i < this.roles.length; i++) {
      var obj = this.roles[i];

      if (
        roles
          .map(data => {
            data.id;
          })
          .indexOf(obj.id) !== -1
      ) {
        this.roles.splice(i, 1);
      }
    }
  }

  /**
   * Adds the selected roles to the selected user
   */
  addRolesToUser(rolesToAdd) {
    this.userFormService
      .addRolesToTheUser$(this.user._id, rolesToAdd)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open(
            "Se han agregado nuevos roles al usuario",
            "Cerrar",
            {
              duration: 2000
            }
          );
        },
        error => {
          console.log("Error adding roles to the user ==> ", error);
        }
      );
  }

  /**
   * Adds the selected roles to the selected user
   */
  removeRolesFromUser(rolesToRemove) {
    this.userFormService
      .removeRolesFromUser$(this.user._id, rolesToRemove, this.paramBusinessId)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("Se han eliminado roles de usuario", "Cerrar", {
            duration: 2000
          });
        },
        error => {
          console.log("Error removing roles from the user ==> ", error);
          //this.refreshRoles();
        }
      );
  }

  /**
   * Detects when a roles has been added or deleted to a user
   * @param $event
   */
  onUserRolesChange(key, roleEvent) {
    if(roleEvent.checked){
      const rolesToAdd = [];
      rolesToAdd.push(key);
      this.addRolesToUser(rolesToAdd);
    }else{
      const rolesToRemove = [];
      rolesToRemove.push(key);
      this.removeRolesFromUser(rolesToRemove);
    }


  }

  /**
   * Detects when the user state has changed and send a command to persist the new state.
   * This method only works with users that are registered.
   *
   * @param $event
   */
  onUserStateChange($event) {
    if (this.pageType == "new") {
      return;
    }

    this.userFormService
      .updateUserState$(this.user._id, this.user._id, $event.checked, this.paramBusinessId)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open(
            "El estado del usuario ha sido actualizado",
            "Cerrar",
            {
              duration: 2000
            }
          );
        },
        error => {
          console.log("Error updating user state => ", error);
        }
      );
  }

  /**
   * Create the user auth on Keycloak
   */
  createUserAuth() {    
    const data = this.userAuthForm.getRawValue();

    this.userFormService
      .createUserAuth$(this.user._id, data)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("El usuario ha sido actualizado", "Cerrar", {
            duration: 2000
          });
          this.userAuthForm.reset();
        },
        error => {
          console.log("Error resetting user password => ", error);
          this.snackBar.open(
            "Error reseteando contraseña del usuario",
            "Cerrar",
            {
              duration: 2000
            }
          );
          this.userAuthForm.reset();
        }
      );
  }

  /**
   * Reset the user password
   */
  changeUserRoles() {
    const data = this.userRolesForm.getRawValue();
    this.userFormService
      .updateUserRoles$(this.user._id, data)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("Los roles del usuario han sido actualizados", "Cerrar", {
            duration: 2000
          });
          this.userAuthForm.reset();
        },
        error => {
          console.log("Error updating user roles => ", error);
          this.snackBar.open(
            "Error actualizando roles del usuario",
            "Cerrar",
            {
              duration: 2000
            }
          );
          this.userAuthForm.reset();
        }
      );
  }

    /**
   * Reset the user password
   */
  removeUserAuth() {
    this.userFormService
      .removeUserAuth$(this.user._id)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("Las credenciales de autenticación han sido eliminadas", "Cerrar", {
            duration: 2000
          });
          this.user.auth = null;
          this.userAuthForm = this.createUserAuthForm();
          this.userAuthForm.reset();
        },
        error => {
          console.log("Error removing user auth credentials => ", error);
          this.snackBar.open(
            "Error eliminando credenciales de autenticación",
            "Cerrar",
            {
              duration: 2000
            }
          );
          this.userAuthForm.reset();
        }
      );
  }

  /**
   * Reset the user password
   */
  resetUserPassword() {
    const data = this.userAuthForm.getRawValue();

    this.userFormService
      .resetUserPassword$(this.user._id, data)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        model => {
          this.snackBar.open("El usuario ha sido actualizado", "Cerrar", {
            duration: 2000
          });
          this.userAuthForm.reset();
        },
        error => {
          console.log("Error resetting user password => ", error);
          this.snackBar.open(
            "Error reseteando contraseña del usuario",
            "Cerrar",
            {
              duration: 2000
            }
          );
          this.userAuthForm.reset();
        }
      );
  }

  graphQlAlarmsErrorHandler$(response) {
    return Rx.Observable.of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);

        return resp;
      })
    );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar("ERRORS." + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(error => {
              this.showMessageSnackbar("ERRORS." + error.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    let translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData).subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : "",
        detailMessageKey ? data[detailMessageKey] : "",
        {
          duration: 2000
        }
      );
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
