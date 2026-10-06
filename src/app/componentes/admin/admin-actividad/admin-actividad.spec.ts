import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminActividad } from './admin-actividad';

describe('AdminActividad', () => {
  let component: AdminActividad;
  let fixture: ComponentFixture<AdminActividad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminActividad],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminActividad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
