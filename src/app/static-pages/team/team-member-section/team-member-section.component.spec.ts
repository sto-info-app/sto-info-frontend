import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemberVm } from '../models/member-vm.model';
import { TEST_TEAM_MEMBERS } from '../testing/team-test-data';
import { TeamMemberSectionComponent } from './team-member-section.component';

describe('TeamMemberSectionComponent', () => {
  let fixture: ComponentFixture<TeamMemberSectionComponent>;

  const vms: MemberVm[] = TEST_TEAM_MEMBERS.slice(0, 2).map(member => ({
    member,
    link: `/about/developers/${member.slug}`,
    thumbnailUrl: `${member.photoUrl}/square100`,
  }));

  const configure = (members: MemberVm[]) => {
    TestBed.configureTestingModule({
      imports: [TeamMemberSectionComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(TeamMemberSectionComponent);
    fixture.componentRef.setInput('title', 'Active Duty');
    fixture.componentRef.setInput('vms', members);
    fixture.componentRef.setInput('emptyMessage', 'Nobody yet.');
    fixture.detectChanges();
  };

  // Each member is a panel card: the name on the heading block with the way
  // on beside it, the photo and title beneath, and the whole card the link to
  // the member's page. The grid rotates the palette across the cards.
  it('draws each member as a panel card that links to their page', () => {
    configure(vms);

    const grid: HTMLElement = fixture.nativeElement.querySelector('.team-grid');
    expect(grid.tagName).toBe('UL');
    expect(grid.classList).toContain('lcars-rotate');

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.team-card'),
    ).map(card => ({
      isLink: card.classList.contains('team-card--link'),
      href: card.querySelector('a.team-card__link')?.getAttribute('href'),
      name: card
        .querySelector('.team-card__heading h3.team-card__name')
        ?.textContent?.trim(),
      chevron: card.querySelector('.team-card__marks .fa-chevron-right'),
      photo: card.querySelector('img.team-card__photo')?.getAttribute('src'),
      title: card
        .querySelector('.team-card__body .team-card__title')
        ?.textContent?.trim(),
    }));

    expect(cards).toEqual([
      {
        isLink: true,
        href: '/about/developers/spock',
        name: 'Spock',
        chevron: expect.any(HTMLElement),
        photo: 'https://example.com/spock/square100',
        title: 'Science Officer',
      },
      {
        isLink: true,
        href: '/about/developers/scotty',
        name: 'Montgomery Scott',
        chevron: expect.any(HTMLElement),
        photo: 'https://example.com/scotty/square100',
        title: 'Chief Engineer',
      },
    ]);
  });

  // The name is the link's text, so the photo says nothing a second time.
  it('leaves the photo out of the accessible name', () => {
    configure(vms);

    expect(
      fixture.nativeElement.querySelector('img.team-card__photo').alt,
    ).toBe('');
  });

  it('shows the empty message when there are no members', () => {
    configure([]);

    expect(fixture.nativeElement.querySelector('.team-grid')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.empty-state')?.textContent?.trim(),
    ).toBe('Nobody yet.');
  });
});
