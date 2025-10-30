import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewProspectComponent } from './view-prospect.component';

describe('ViewProspectComponent', () => {
  let component: ViewProspectComponent;
  let fixture: ComponentFixture<ViewProspectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ViewProspectComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewProspectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
