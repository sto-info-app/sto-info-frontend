import { Routes } from '@angular/router';
import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeLandingComponent } from './landing/storytime-landing.component';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';

/**
 * Storytime's routes, loaded on demand.
 *
 * Lazy-loaded rather than declared in the root routing module, which is how the
 * rest of the application works today. Storytime brings a large number of
 * components and an editor, and loading those for every visitor — including the
 * majority who never open it — would cost the whole site's first paint.
 *
 * Every route sits behind {@link StorytimeEnabledGuard} at the parent level, so
 * a route added later cannot accidentally escape the feature switch.
 */
export const STORYTIME_ROUTES: Routes = [
  {
    path: '',
    canActivate: [StorytimeEnabledGuard],
    children: [
      {
        path: '',
        component: StorytimeLandingComponent,
        data: { title: APP_ROUTE_TITLES.STORYTIME },
      },
    ],
  },
];
