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

      // The moderation queue. Behind the moderation permission rather than the
      // ADMIN role, because moderating Storytime is a job somebody can be
      // given without the rest of the site coming with it.
      {
        path: 'manage/moderation',
        loadComponent: () =>
          import('./admin/moderation-queue/moderation-queue.component').then(
            m => m.ModerationQueueComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MODERATION,
          permission: PERMISSIONS.STORYTIME_MODERATE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      // The tag vocabulary. Behind its own permission rather than a creator
      // one: a tag is a shared classification rather than one creator's label,
      // and it is part of running Storytime rather than configuring it.
      {
        path: 'manage/tags',
        loadComponent: () =>
          import('./admin/tag-admin/tag-admin.component').then(
            m => m.TagAdminComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.STORYTIME_MANAGE_TAGS,
          permission: PERMISSIONS.STORYTIME_TAG_MANAGE,
        },
        canActivate: [AuthGuard, PermissionGuard],
      },

      // The three publishing documents are the Storytime pages that must be
      // readable by anybody: a reader deciding whether to report something, a
      // creator deciding whether to publish, and a rights holder deciding
      // whether the site claims anything it should not, all need them before
      // they have an account — or without ever wanting one.
      //
      // One way in for anybody who wants "the Storytime policies" rather than
      // a particular document. The set opens on the content policy, which is
      // the one a creator or a reporter came for; the tabs carry them to the
      // other two.
      {
        path: 'policies',
        redirectTo: 'content-policy',
        pathMatch: 'full',
      },
      {
        path: 'content-policy',
        loadComponent: () =>
          import('./public/content-policy/content-policy.component').then(
            m => m.ContentPolicyComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_CONTENT_POLICY },
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./public/storytime-terms/storytime-terms.component').then(
            m => m.StorytimeTermsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_TERMS },
      },
      {
        path: 'fan-content',
        loadComponent: () =>
          import('./public/fan-content-notice/fan-content-notice.component').then(
            m => m.FanContentNoticeComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_FAN_CONTENT },
      },
      {
        path: 'removed',
        loadComponent: () =>
          import('./public/removed-content/removed-content.component').then(
            m => m.RemovedContentComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_REMOVED },
      },

      // Search and creator pages need no account: finding something to read is
      // the least private thing anybody does here.
      {
        path: 'search',
        loadComponent: () =>
          import('./public/storytime-search/storytime-search.component').then(
            m => m.StorytimeSearchComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_SEARCH },
      },
      {
        path: 'creators/:userId',
        loadComponent: () =>
          import('./public/creator-page/creator-page.component').then(
            m => m.CreatorPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_CREATOR },
      },
      {
        path: 'creators/:userId/reading-lists/:slug',
        loadComponent: () =>
          import('./public/reading-list-detail/reading-list-detail.component').then(
            m => m.ReadingListDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_PUBLIC_READING_LIST },
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

      // A feed and a reader's own lists are one person's, so both need an
      // account in the same way the library does.
      {
        path: 'feed',
        loadComponent: () =>
          import('./public/activity-feed/activity-feed.component').then(
            m => m.ActivityFeedComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_FEED },
        canActivate: [AuthGuard],
      },
      {
        path: 'reading-lists',
        loadComponent: () =>
          import('./public/reading-lists/reading-lists.component').then(
            m => m.ReadingListsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_READING_LISTS },
        canActivate: [AuthGuard],
      },
      {
        path: 'reading-lists/:listId',
        loadComponent: () =>
          import('./public/reading-list-detail/reading-list-detail.component').then(
            m => m.ReadingListDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.STORYTIME_READING_LIST },
        canActivate: [AuthGuard],
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
