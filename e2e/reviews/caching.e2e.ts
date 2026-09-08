import { member } from '../support/member';
import { expect, test } from '../support/fixtures';

/**
 * The caching review.
 *
 * Making something private has to take effect at once. Everywhere else that is
 * a question about invalidation; here it is answered by there being nothing to
 * invalidate — the registry's answers are marked not to be stored, by the
 * browser or by anything between it and us.
 *
 * That is a decision worth a test rather than a paragraph. Adding a cache
 * header to these routes later would be an easy and reasonable-looking change,
 * and its consequence — somebody's answer still being served after they took
 * it down — would not show up in any other suite.
 */

const SECTION = 'Cache review section';
const TAB = 'Cache review tab';
const FIELD = 'Cache review field';
const ANSWER = 'Should stop being served the moment it is private';

const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:3000';

const publicAccountEndpoint = () =>
  `${apiUrl}/registry/profiles/${member.username}/${member.publicAccount}`;

test('published answers are never stored by anything in the way', async ({
  request,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('publish an answer', async () => {
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'TEXT_SINGLE_LINE',
      publiclyVisible: true,
    });
    await tracking.recordAnswer(member.publicAccount, FIELD, ANSWER);
  });

  await test.step('the answer is served, and told to be kept by nobody', async () => {
    const response = await request.get(publicAccountEndpoint());

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(ANSWER);

    const headers = response.headers();

    expect(headers['cache-control']).toContain('no-store');

    // Cloudflare sits in front of this in production and obeys its own header
    // rather than Cache-Control, so both have to say it.
    expect(headers['surrogate-control']).toContain('no-store');
  });

  await test.step('taking it private stops it being served immediately', async () => {
    await tracking.show('What you track');
    await tracking.expand(SECTION);
    await tracking.setPublic('section', SECTION, false);

    const response = await request.get(publicAccountEndpoint());

    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain(ANSWER);
  });
});
