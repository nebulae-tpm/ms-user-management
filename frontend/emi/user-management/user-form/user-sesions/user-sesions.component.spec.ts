import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSesionsComponent } from './user-sesions.component';

describe('UserSesionsComponent', () => {
  let component: UserSesionsComponent;
  let fixture: ComponentFixture<UserSesionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserSesionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSesionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
