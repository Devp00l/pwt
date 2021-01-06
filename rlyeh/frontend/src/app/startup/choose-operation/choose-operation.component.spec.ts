import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseOperationComponent } from './choose-operation.component';

describe('ChooseOperationComponent', () => {
  let component: ChooseOperationComponent;
  let fixture: ComponentFixture<ChooseOperationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChooseOperationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseOperationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
