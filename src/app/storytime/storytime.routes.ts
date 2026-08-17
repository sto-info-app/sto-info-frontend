import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { PermissionGuard } from 'src/app/core/auth/permission.guard';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeLandingComponent } from './landing/storytime-landing.component';
import { StorytimeEnabledGuard } from './storytime-enabled.guard';

/**
 * Storytime's routes, loaded on demand.
 *
 * Lazy-loaded because Storytime brings a large number of components and an
 * editor, and loading those for every visitor — including the majority who
 * never open it — would cost the whole site's first paint.
 *
 * Every route sits behind {@link StorytimeEnabledGuard} at the parent level, so
 * a route added later cannot accidentally escape the feature switch. Creator
 * routes add authentication and a permission on top, and each component is
 * loaded only when its route is reached.
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

      // Creator routes are declared before the public `stories/:storySlug`
      // route so that `stories/new` is never mistaken for a Story slug.
      {
        path: 'manage/stories',
        loadComponent: () =>
          import('./creator/story-dashboard/story-dashboard.component').then(
            m => m.StoryDashboardComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MANAGE,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/stories/new',
        loadComponent: () =>
          import('./creator/story-editor/story-editor.component').then(
            m => m.StoryEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_STORY_NEW,
          permission: PERMISSIONS.STORYTIME_STORY_CREATE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/stories/:storyId',
        loadComponent: () =>
          import('./creator/story-editor/story-editor.component').then(
            m => m.StoryEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_STORY_EDIT,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      {
        path: 'manage/stories/:storyId/chapters',
        loadComponent: () =>
          import('./creator/chapter-list/chapter-list.component').then(
            m => m.ChapterListComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MANAGE_CHAPTERS,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/stories/:storyId/chapters/new',
        loadComponent: () =>
          import('./creator/chapter-editor/chapter-editor.component').then(
            m => m.ChapterEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_CHAPTER_NEW,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/stories/:storyId/characters',
        loadComponent: () =>
          import('./creator/character-list/character-list.component').then(
            m => m.CharacterListComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MANAGE_CHARACTERS,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/stories/:storyId/characters/new',
        loadComponent: () =>
          import('./creator/character-editor/character-editor.component').then(
            m => m.CharacterEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_CHARACTER_NEW,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/characters/:characterId',
        loadComponent: () =>
          import('./creator/character-editor/character-editor.component').then(
            m => m.CharacterEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_CHARACTER_EDIT,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      {
        path: 'manage/stories/:storyId/collaborators',
        loadComponent: () =>
          import('./creator/collaborator-list/collaborator-list.component').then(
            m => m.CollaboratorListComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_COLLABORATORS,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      // Answering an invitation deliberately needs no creator permission: it
      // is how somebody who does not write becomes able to.
      {
        path: 'manage/invitations',
        loadComponent: () =>
          import('./creator/invitations/invitations.component').then(
            m => m.InvitationsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_INVITATIONS },
        canActivate: [AuthGuard],
      },

      // Curating an Arc needs sign-in but no creator permission: an Arc is a
      // reading order over other people's Stories, not a claim on any of them,
      // so a reader who never writes may still assemble one. Declared before
      // the public `arcs/:arcSlug` route so `manage/arcs` cannot be read as a
      // slug.
      {
        path: 'manage/arcs',
        loadComponent: () =>
          import('./creator/arc-dashboard/arc-dashboard.component').then(
            m => m.ArcDashboardComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_MANAGE_ARCS },
        canActivate: [AuthGuard],
      },
      {
        path: 'manage/arcs/new',
        loadComponent: () =>
          import('./creator/arc-editor/arc-editor.component').then(
            m => m.ArcEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARC_NEW },
        canActivate: [AuthGuard],
      },
      {
        path: 'manage/arcs/:arcId',
        loadComponent: () =>
          import('./creator/arc-editor/arc-editor.component').then(
            m => m.ArcEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARC_EDIT },
        canActivate: [AuthGuard],
      },
      {
        path: 'manage/arcs/:arcId/stories',
        loadComponent: () =>
          import('./creator/arc-story-list/arc-story-list.component').then(
            m => m.ArcStoryListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARC_STORIES },
        canActivate: [AuthGuard],
      },
      {
        path: 'manage/arcs/:arcId/collaborators',
        loadComponent: () =>
          import('./creator/arc-collaborator-list/arc-collaborator-list.component').then(
            m => m.ArcCollaboratorListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARC_COLLABORATORS },
        canActivate: [AuthGuard],
      },

      // Editorial routes. Gated by the Spotlight permission rather than by the
      // ADMIN role, because choosing what the site features is a job somebody
      // can be given without being handed the rest of the site with it.
      // Declared before `spotlight` so `manage/spotlight` cannot be read as a
      // selection slug.
      {
        path: 'manage/spotlight',
        loadComponent: () =>
          import('./admin/spotlight-admin-list/spotlight-admin-list.component').then(
            m => m.SpotlightAdminListComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MANAGE_SPOTLIGHT,
          permission: PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/spotlight/new',
        loadComponent: () =>
          import('./admin/spotlight-admin-form/spotlight-admin-form.component').then(
            m => m.SpotlightAdminFormComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_SPOTLIGHT_NEW,
          permission: PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },
      {
        path: 'manage/spotlight/:spotlightId',
        loadComponent: () =>
          import('./admin/spotlight-admin-form/spotlight-admin-form.component').then(
            m => m.SpotlightAdminFormComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_SPOTLIGHT_EDIT,
          permission: PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      // Reading the Spotlight needs no account at all.
      {
        path: 'spotlight',
        loadComponent: () =>
          import('./public/spotlight-archive/spotlight-archive.component').then(
            m => m.SpotlightArchiveComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_SPOTLIGHT },
      },

      {
        path: 'manage/chapters/:chapterId',
        loadComponent: () =>
          import('./creator/chapter-editor/chapter-editor.component').then(
            m => m.ChapterEditorComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_CHAPTER_EDIT,
          permission: PERMISSIONS.STORYTIME_STORY_EDIT_OWN,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      {
        path: 'library',
        loadComponent: () =>
          import('./public/reader-library/reader-library.component').then(
            m => m.ReaderLibraryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_LIBRARY },
        canActivate: [AuthGuard],
      },

      {
        path: 'arcs',
        loadComponent: () =>
          import('./public/arc-list/arc-list.component').then(
            m => m.ArcListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARCS },
      },
      {
        path: 'arcs/:arcSlug',
        loadComponent: () =>
          import('./public/arc-detail/arc-detail.component').then(
            m => m.ArcDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_ARC },
      },

      {
        path: 'stories',
        loadComponent: () =>
          import('./public/story-list/story-list.component').then(
            m => m.StoryListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_STORIES },
      },
      {
        path: 'stories/:storySlug',
        loadComponent: () =>
          import('./public/story-detail/story-detail.component').then(
            m => m.StoryDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_STORY },
      },
      {
        path: 'stories/:storySlug/characters/:characterSlug',
        loadComponent: () =>
          import('./public/character-detail/storytime-character-detail.component').then(
            m => m.StorytimeCharacterDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_CHARACTER },
      },
      {
        path: 'stories/:storySlug/chapters/:chapterSlug',
        loadComponent: () =>
          import('./public/chapter-reader/chapter-reader.component').then(
            m => m.ChapterReaderComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_CHAPTER },
      },
    ],
  },
];
