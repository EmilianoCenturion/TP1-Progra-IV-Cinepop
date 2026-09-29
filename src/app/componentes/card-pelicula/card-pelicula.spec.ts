import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardPelicula } from './card-pelicula';

describe('CardPelicula', () => {
  let component: CardPelicula;
  let fixture: ComponentFixture<CardPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(CardPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
