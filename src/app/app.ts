import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, Scroll } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('wild-life');

  constructor() {
    const router = inject(Router);
    const document = inject(DOCUMENT);
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof Scroll) || event.position || event.anchor) return;
      const navigation = event.routerEvent;
      if (!(navigation instanceof NavigationEnd)) return;
      const stage = document.querySelector('[data-world-stage]');
      if (!stage) return;

      // Run after the router's default scroll so fresh world routes start at their canvas.
      document.defaultView?.requestAnimationFrame(() => {
        if (stage.isConnected && router.url === navigation.urlAfterRedirects) {
          stage.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
      });
    });
  }
}
