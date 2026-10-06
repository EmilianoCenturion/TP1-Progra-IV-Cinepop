import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComboForm } from './admin-combo-form';

describe('AdminComboForm', () => {
  let component: AdminComboForm;
  let fixture: ComponentFixture<AdminComboForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComboForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComboForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
