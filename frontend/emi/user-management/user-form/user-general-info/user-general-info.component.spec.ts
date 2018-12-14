import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserGeneralInfoComponent } from './user-general-info.component';

describe('UserGeneralInfoComponent', () => {
  let component: UserGeneralInfoComponent;
  let fixture: ComponentFixture<UserGeneralInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserGeneralInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserGeneralInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
