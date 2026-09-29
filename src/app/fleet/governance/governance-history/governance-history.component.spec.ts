import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import {
  GovernanceReader,
  governanceRoute,
  scopeRoles,
} from 'src/app/fleet/governance/governance.testing';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetScopeRole,
  ScopeGovernanceAction,
  ScopeGovernanceActionKind,
} from 'src/app/models/fleet-governance.models';

import {
  GOVERNANCE_HISTORY_NOT_PERMITTED,
  GovernanceHistoryComponent,
} from './governance-history.component';

/**
 * Builds a change.
 *
 * @param overrides - Fields to override.
 * @returns The change.
 */
function change(
  overrides: Partial<ScopeGovernanceAction> = {},
): ScopeGovernanceAction {
  return {
    id: 'action-1',
    action: ScopeGovernanceActionKind.ROLE_ASSIGNED,
    actorName: 'FleetOwner',
    asSiteAdmin: false,
    subjectName: 'FleetAdmin',
    role: FleetScopeRole.ADMIN,
    capability: null,
    clearedEffect: null,
    reason: null,
    automatic: false,
    createdAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('GovernanceHistoryComponent', () => {
  let fixture: ComponentFixture<GovernanceHistoryComponent>;
  let governance: { history: jest.Mock; roles: jest.Mock };

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, and where.
   */
  async function render(
    reader: GovernanceReader = { roles: ['ADMIN'] },
  ): Promise<void> {
    const route = governanceRoute(reader, governance);

    await TestBed.configureTestingModule({
      imports: [GovernanceHistoryComponent],
      providers: route.providers,
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceHistoryComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    governance = {
      history: jest.fn(() =>
        of([
          change({
            id: 'action-2',
            action: ScopeGovernanceActionKind.CAPABILITY_DENIED,
            subjectName: 'FleetApplicant',
            role: null,
            capability: 'news.write',
            reason: 'Posted spam.',
          }),
          change(),
        ]),
      ),
      roles: jest.fn(() => of(scopeRoles({ mayManage: false }))),
    };
  });

  it('says what changed, naming capabilities as Delegation does', async () => {
    await render();

    const text = pageText(fixture);

    expect(governance.history).toHaveBeenCalledWith({
      communityId: 'community-1',
      fleetId: null,
    });
    expect(text).toContain('FleetOwner denied “Write news” to FleetApplicant.');
    expect(text).toContain('Reason: Posted spam.');
    expect(text).toContain('FleetOwner made FleetAdmin an Admin.');
    expect(text).toContain('Back to Manage');
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.governance-history__reason',
      ),
    ).toHaveLength(1);
  });

  it('says so when nothing has changed', async () => {
    governance.history.mockReturnValue(of([]));
    await render();

    expect(pageText(fixture)).toContain('Nothing about how this is run');
  });

  it('turns away somebody who holds no role that reads it', async () => {
    await render({ roles: ['MEMBER'] });

    expect(pageText(fixture)).toContain(GOVERNANCE_HISTORY_NOT_PERMITTED);
    expect(governance.history).not.toHaveBeenCalled();
  });
});
