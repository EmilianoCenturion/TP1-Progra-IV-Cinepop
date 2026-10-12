import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidarQr } from './validar-qr';

describe('ValidarQr', () => {
  let component: ValidarQr;
  let fixture: ComponentFixture<ValidarQr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidarQr],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidarQr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
