import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPeliculaForm } from './admin-pelicula-form';

describe('AdminPeliculaForm', () => {
  let component: AdminPeliculaForm;
  let fixture: ComponentFixture<AdminPeliculaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPeliculaForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPeliculaForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
