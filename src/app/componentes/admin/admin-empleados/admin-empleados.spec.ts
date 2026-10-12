import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEmpleados } from './admin-empleados';

describe('AdminEmpleados', () => {
  let component: AdminEmpleados;
  let fixture: ComponentFixture<AdminEmpleados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEmpleados],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEmpleados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
