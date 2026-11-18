import { TestBed } from '@angular/core/testing';
import { DsButtonComponent } from './button';

describe('DsButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DsButtonComponent],
    }).compileComponents();
  });

  it('renders a native button with safe default type and subtle visual variant', () => {
    const fixture = TestBed.createComponent(DsButtonComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button).toBeTruthy();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.classList.contains('ds-button--subtle')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBeNull();
  });

  it('provides semantic pressed state for segmented controls', () => {
    const fixture = TestBed.createComponent(DsButtonComponent);
    fixture.componentRef.setInput('variant', 'segmented');
    fixture.componentRef.setInput('pressed', true);
    fixture.componentRef.setInput('ariaLabel', 'Population data');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.classList.contains('ds-button--segmented')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Population data');

    fixture.componentRef.setInput('pressed', false);
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('honors disabled and submit inputs', () => {
    const fixture = TestBed.createComponent(DsButtonComponent);
    fixture.componentRef.setInput('type', 'submit');
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('variant', 'primary');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.type).toBe('submit');
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('ds-button--primary')).toBe(true);
  });

  it('bubbles a native button click to the component host', () => {
    const fixture = TestBed.createComponent(DsButtonComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const click = vi.fn();
    fixture.nativeElement.addEventListener('click', click);
    button.click();

    expect(click).toHaveBeenCalledTimes(1);
  });
});
