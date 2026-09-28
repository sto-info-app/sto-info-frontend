import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  ARMADA_HREF,
  resolvedArmada,
} from 'src/app/fleet/armadas/armada.testing';

import { ArmadaTabsComponent, armadaTabsVmOf } from './armada-tabs.component';

describe('ArmadaTabsComponent', () => {
  let fixture: ComponentFixture<ArmadaTabsComponent>;

  /**
   * Draws the strip for a reader.
   *
   * @param capabilities - What they hold there.
   * @param roles - The role labels they hold there.
   */
  function render(capabilities: string[] = [], roles: string[] = []): void {
    TestBed.configureTestingModule({
      imports: [ArmadaTabsComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ArmadaTabsComponent);
    fixture.componentRef.setInput(
      'vm',
      armadaTabsVmOf(resolvedArmada(capabilities, roles)),
    );
    fixture.detectChanges();
  }

  /**
   * The tabs offered, as label and address.
   *
   * @returns Each tab.
   */
  function tabs(): [string, string | null][] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(tab => [String(tab.textContent).trim(), tab.getAttribute('href')]);
  }

  it('builds its view model from the resolved Armada', () => {
    expect(
      armadaTabsVmOf(resolvedArmada(['armada.manage'], ['OWNER'])),
    ).toEqual({
      communitySlug: 'united-federation-alliance',
      platformSegment: 'pc',
      armadaSlug: 'sol-armada',
      capabilities: ['armada.manage'],
      roles: ['OWNER'],
    });
  });

  it('offers anybody the Overview, the News and the History', () => {
    render();

    expect(tabs()).toEqual([
      ['Overview', ARMADA_HREF],
      ['News', `${ARMADA_HREF}/news`],
      ['History', `${ARMADA_HREF}/history`],
    ]);
  });

  it('offers the Requests to an armada.manage holder', () => {
    render(['armada.manage']);

    expect(tabs().map(([label]) => label)).toEqual([
      'Overview',
      'News',
      'History',
      'Requests',
    ]);
    expect(tabs()[3][1]).toBe(`${ARMADA_HREF}/requests`);
  });

  it('offers Manage to its Owner and Admins', () => {
    render([], ['ADMIN']);

    expect(tabs()[3]).toEqual(['Manage', `${ARMADA_HREF}/manage`]);
  });

  it('offers Manage to nobody else', () => {
    render([], ['OFFICER']);

    expect(tabs()).toHaveLength(3);
  });
});
