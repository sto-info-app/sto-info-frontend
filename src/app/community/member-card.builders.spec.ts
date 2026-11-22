import {
  MEMBER_CARD_ACCEPT_REQUEST,
  MEMBER_CARD_ADD_FRIEND,
  MEMBER_CARD_BLOCK,
  MEMBER_CARD_CHAT,
  MEMBER_CARD_UNFRIEND,
  buildFriendMemberCard,
  buildRegistryMemberCard,
  withPresence,
} from './member-card.builders';
import {
  CommunityMember,
  Friend,
  RelationshipStatus,
} from './models/community.models';
import { RegistryProfileSummary } from './models/registry.models';
import { buildProfileSummary } from './registry/registry-test-fixtures';

/**
 * Builds a registry member summary carrying a given relationship.
 *
 * @param status - The relationship the API reported.
 * @returns A member summary.
 */
function withRelationship(status: RelationshipStatus): RegistryProfileSummary {
  return buildProfileSummary({
    relationship: { status, friendshipId: 'friendship-1', blockId: null },
  });
}

/**
 * Builds a community member fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A community member.
 */
function buildMember(
  overrides: Partial<CommunityMember> = {},
): CommunityMember {
  return {
    username: 'captain.picard',
    profilePicture100: 'https://cdn.example.com/pic/square100',
    profilePicture300: 'https://cdn.example.com/pic/square300',
    joinedAt: '2026-01-14T09:21:00.000Z',
    lastActiveAt: '2026-08-01T12:00:00.000Z',
    playingSince: '2015-03-04',
    publicAccountCount: 2,
    publicCharacterCount: 11,
    publiclyVisible: true,
    ...overrides,
  };
}

/**
 * Builds a friend fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A friend.
 */
function buildFriend(overrides: Partial<Friend> = {}): Friend {
  return {
    id: 'friendship-1',
    member: buildMember(),
    friendsSince: '2026-08-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * The keys of the actions a card offers.
 *
 * @param actions - The card's actions.
 * @returns The action keys, in order.
 */
function keysOf(actions: { key: string }[]): string[] {
  return actions.map(action => action.key);
}

describe('memberCardBuilders', () => {
  describe('buildRegistryMemberCard', () => {
    it('should map the member onto the card identity and counts', () => {
      const card = buildRegistryMemberCard(buildProfileSummary(), false);

      expect(card).toEqual(
        expect.objectContaining({
          id: 'captain.picard',
          username: 'captain.picard',
          imageUrl: 'https://cdn.example.com/pic/square100',
          link: ['/community/registry/profiles', 'captain.picard'],
        }),
      );
      expect(card.gameDetails).toEqual([
        { label: 'Accounts', value: '2' },
        { label: 'Captains', value: '11' },
        { label: 'Playing since', value: 'March 4, 2015' },
      ]);
    });

    it('should leave the username raw for routerLink to encode', () => {
      const card = buildRegistryMemberCard(
        buildProfileSummary({ username: 'a b/c' }),
        false,
      );

      expect(card.link).toEqual(['/community/registry/profiles', 'a b/c']);
    });

    it('should show when the member joined, was last seen and started playing', () => {
      const card = buildRegistryMemberCard(buildProfileSummary(), false);

      expect(card.siteDetails).toEqual([
        { label: 'Joined', value: 'January 14, 2026' },
        { label: 'Last seen', value: 'August 1, 2026' },
      ]);
    });

    it('should omit the last seen line when the member never signed in', () => {
      const card = buildRegistryMemberCard(
        buildProfileSummary({ lastActiveAt: null }),
        false,
      );

      expect(card.siteDetails).toEqual([
        { label: 'Joined', value: 'January 14, 2026' },
      ]);
    });

    it('should omit the playing since line when no account records a date', () => {
      const card = buildRegistryMemberCard(
        buildProfileSummary({ playingSince: null }),
        false,
      );

      expect(card.gameDetails.map(detail => detail.label)).toEqual([
        'Accounts',
        'Captains',
      ]);
    });

    describe('relationship indicator', () => {
      it('should show no badge for an anonymous visitor', () => {
        const card = buildRegistryMemberCard(buildProfileSummary(), false);

        expect(card.badge).toBeNull();
      });

      it('should show no badge when there is no relationship', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.NONE),
          true,
        );

        expect(card.badge).toBeNull();
      });

      it('should flag a friend', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.FRIENDS),
          true,
        );

        expect(card.badge).toEqual({ label: 'Friend', modifier: 'friend' });
      });

      it('should flag the viewer own card', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.SELF),
          true,
        );

        expect(card.badge).toEqual({ label: 'You', modifier: 'self' });
      });

      it('should flag a request the viewer sent', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.REQUEST_SENT),
          true,
        );

        expect(card.badge).toEqual({
          label: 'Request sent',
          modifier: 'pending',
        });
      });

      it('should flag a request the viewer received', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.REQUEST_RECEIVED),
          true,
        );

        expect(card.badge?.label).toBe('Wants to be friends');
      });

      it('should show a badge even when the viewer cannot act', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.FRIENDS),
          false,
        );

        expect(card.badge?.label).toBe('Friend');
      });
    });

    describe('call to action', () => {
      it('should offer nothing to an anonymous visitor', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.NONE),
          false,
        );

        expect(card.actions).toEqual([]);
      });

      it('should offer Add Friend and Block for an unrelated member', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.NONE),
          true,
        );

        expect(keysOf(card.actions)).toEqual([
          MEMBER_CARD_ADD_FRIEND,
          MEMBER_CARD_BLOCK,
        ]);
      });

      it('should offer Accept and Block for a received request', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.REQUEST_RECEIVED),
          true,
        );

        expect(keysOf(card.actions)).toEqual([
          MEMBER_CARD_ACCEPT_REQUEST,
          MEMBER_CARD_BLOCK,
        ]);
      });

      it('should offer Unfriend and Block for an existing friend', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.FRIENDS),
          true,
        );

        expect(keysOf(card.actions)).toEqual([
          MEMBER_CARD_UNFRIEND,
          MEMBER_CARD_BLOCK,
        ]);
      });

      // Both remove, so both are red; their labels tell them apart.
      it('should colour Unfriend and Block as removing', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.FRIENDS),
          true,
        );

        expect(card.actions[0].colourClass).toBe('red');
        expect(card.actions[1].colourClass).toBe('red');
      });

      it('should offer nothing on the viewer own card', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.SELF),
          true,
        );

        expect(card.actions).toEqual([]);
      });

      it('should offer nothing while a request is pending', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.REQUEST_SENT),
          true,
        );

        expect(card.actions).toEqual([]);
      });

      it('should label each button with the member it acts on', () => {
        const card = buildRegistryMemberCard(
          withRelationship(RelationshipStatus.NONE),
          true,
        );

        expect(card.actions.map(action => action.ariaLabel)).toEqual([
          'Add captain.picard as a friend',
          'Block captain.picard',
        ]);
      });
    });
  });

  // FC-033: chat with a friend from their card, while chat is switched on.
  describe('chat', () => {
    it('should offer Chat first to a friend when chat is on', () => {
      const card = buildRegistryMemberCard(
        withRelationship(RelationshipStatus.FRIENDS),
        true,
        undefined,
        true,
      );

      expect(card.actions.map(action => action.key)).toEqual([
        MEMBER_CARD_CHAT,
        MEMBER_CARD_UNFRIEND,
        MEMBER_CARD_BLOCK,
      ]);
      expect(card.actions[0]).toEqual({
        key: MEMBER_CARD_CHAT,
        label: 'Chat',
        colourClass: '',
        ariaLabel: 'Chat with captain.picard',
      });
    });

    it('should offer no Chat while chat is off, or to anybody but a friend', () => {
      const friend = buildRegistryMemberCard(
        withRelationship(RelationshipStatus.FRIENDS),
        true,
      );
      const stranger = buildRegistryMemberCard(
        withRelationship(RelationshipStatus.NONE),
        true,
        undefined,
        true,
      );

      expect(friend.actions.map(action => action.key)).toEqual([
        MEMBER_CARD_UNFRIEND,
        MEMBER_CARD_BLOCK,
      ]);
      expect(stranger.actions.map(action => action.key)).toEqual([
        MEMBER_CARD_ADD_FRIEND,
        MEMBER_CARD_BLOCK,
      ]);
    });

    it('should offer Chat before Unfriend on the friends list when chat is on', () => {
      expect(
        buildFriendMemberCard(buildFriend(), undefined, true).actions.map(
          action => action.key,
        ),
      ).toEqual([MEMBER_CARD_CHAT, MEMBER_CARD_UNFRIEND]);
      expect(
        buildFriendMemberCard(buildFriend()).actions.map(action => action.key),
      ).toEqual([MEMBER_CARD_UNFRIEND]);
    });
  });

  // FC-034: the dot beside the name, from the presence last read.
  describe('withPresence', () => {
    it('should mark a card online when its member is, and not otherwise', () => {
      const card = buildRegistryMemberCard(buildProfileSummary(), false);

      expect(card.online).toBe(false);
      expect(withPresence(card, new Set(['captain.picard'])).online).toBe(true);
      expect(withPresence(card, new Set(['somebody.else'])).online).toBe(false);
    });
  });

  describe('buildFriendMemberCard', () => {
    it('should track the friendship, not the member, so unfriending has an id', () => {
      const card = buildFriendMemberCard(buildFriend());

      expect(card.id).toBe('friendship-1');
    });

    it('should read as the registry listing does', () => {
      const card = buildFriendMemberCard(buildFriend());

      expect(card).toEqual(
        expect.objectContaining({
          username: 'captain.picard',
          imageUrl: 'https://cdn.example.com/pic/square100',
          link: ['/community/registry/profiles', 'captain.picard'],
        }),
      );
      // Shorter dates than the registry's: the list sits beside a side bar.
      expect(card.gameDetails).toEqual([
        { label: 'Accounts', value: '2' },
        { label: 'Captains', value: '11' },
        { label: 'Playing since', value: 'Mar 4, 2015' },
      ]);
    });

    // Every card in the list is a friend, so the pill would be noise.
    it('should carry no relationship badge', () => {
      const card = buildFriendMemberCard(buildFriend());

      expect(card.badge).toBeNull();
    });

    it('should add when the friendship began', () => {
      const card = buildFriendMemberCard(buildFriend());

      expect(card.siteDetails).toEqual([
        { label: 'Joined', value: 'Jan 14, 2026' },
        { label: 'Last seen', value: 'Aug 1, 2026' },
        { label: 'Friends since', value: 'Aug 2, 2026' },
      ]);
    });

    it('should omit the friends-since line when the date is missing', () => {
      const card = buildFriendMemberCard(buildFriend({ friendsSince: null }));

      expect(card.siteDetails.map(detail => detail.label)).not.toContain(
        'Friends since',
      );
      expect(card.siteDetails).toHaveLength(2);
    });

    it('should not link a friend who has made their record private', () => {
      const card = buildFriendMemberCard(
        buildFriend({ member: buildMember({ publiclyVisible: false }) }),
      );

      expect(card.link).toBeNull();
      expect(card.unlinkedTitle).toBe(
        'This officer has made their record private.',
      );
    });

    it('should offer only Unfriend', () => {
      const card = buildFriendMemberCard(buildFriend());

      expect(keysOf(card.actions)).toEqual([MEMBER_CARD_UNFRIEND]);
      expect(card.actions[0].ariaLabel).toBe('Unfriend captain.picard');
    });
  });
});
