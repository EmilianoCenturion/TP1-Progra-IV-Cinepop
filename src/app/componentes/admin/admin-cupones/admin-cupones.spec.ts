import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCupones } from './admin-cupones';

describe('AdminCupones', () => {
  let component: AdminCupones;
  let fixture: ComponentFixture<AdminCupones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCupones],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCupones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
