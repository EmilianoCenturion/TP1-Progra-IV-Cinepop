import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminProductoForm } from './admin-producto-form';

describe('AdminProductoForm', () => {
  let component: AdminProductoForm;
  let fixture: ComponentFixture<AdminProductoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductoForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
