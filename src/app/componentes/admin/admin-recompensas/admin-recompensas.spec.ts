import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRecompensas } from './admin-recompensas';

describe('AdminRecompensas', () => {
  let component: AdminRecompensas;
  let fixture: ComponentFixture<AdminRecompensas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRecompensas],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRecompensas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
