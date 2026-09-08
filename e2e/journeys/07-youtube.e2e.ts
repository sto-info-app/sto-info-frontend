import { anonymously } from '../support/anonymous';
import { member, publicAccountPath } from '../support/member';
import { openPublishedSection } from '../support/public-page';
import { expect, test } from '../support/fixtures';

/**
 * Journey 7 — YouTube addresses in, one video out.
 *
 * The field stores an identifier, never an address, so the forms an address
 * can take are the interesting part: two that name the same video must end up
 * the same, and something that merely looks like one must be refused.
 *
 * The published end is checked anonymously, and specifically for what is *not*
 * loaded: no player, and none of what a player brings with it, until a reader
 * presses play.
 */

const SECTION = 'Highlights';
const TAB = 'Video';
const FIELD = 'Highlight reel';

const VIDEO = 'dQw4w9WgXcQ';
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO}`;
const SHORT_URL = `https://youtu.be/${VIDEO}`;
const IMPOSTOR_URL = `https://example.com/watch?v=${VIDEO}`;

test('only real YouTube addresses are taken, and nothing loads unasked', async ({
  browser,
  page,
  tracking,
}) => {
  await tracking.openReady();

  await test.step('a public video field on a public account', async () => {
    await tracking.buildOneField({
      section: SECTION,
      tab: TAB,
      field: FIELD,
      type: 'YOUTUBE',
      publiclyVisible: true,
    });
  });

  await tracking.show('What you have recorded');
  await tracking.chooseScope(tracking.values, 'Accounts');
  await tracking.chooseTarget(member.publicAccount);

  const address = tracking.values.getByLabel(FIELD, { exact: true });

  await test.step('something that is not YouTube is refused', async () => {
    await address.fill(IMPOSTOR_URL);
    await tracking.saveRecord();

    await expect(tracking.savedConfirmation).toBeHidden();
    await expect(
      page.getByText(`${FIELD} needs a link to a YouTube video.`),
    ).toBeVisible();
  });

  await test.step('the watch address is taken', async () => {
    await address.fill(WATCH_URL);
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('and so is the short one, for the same video', async () => {
    await address.fill(SHORT_URL);
    await tracking.saveRecord();
    await expect(tracking.savedConfirmation).toBeVisible();
  });

  await test.step('a visitor gets one video, and only when they ask', async () => {
    await anonymously(browser, async page => {
      await page.goto(publicAccountPath(member.publicAccount));
      await openPublishedSection(page, SECTION);

      // No player until it is asked for. The poster image does come from
      // Google's thumbnail host, so this is not "nothing reaches YouTube" —
      // it is that no embed, and therefore none of what an embed brings with
      // it, is loaded until a reader presses play.
      await expect(page.locator('iframe')).toHaveCount(0);

      const poster = page.getByRole('button', {
        name: `Play the video for ${FIELD}`,
      });

      await expect(poster).toHaveCount(1);
      await poster.click();

      const player = page.locator('iframe');

      await expect(player).toHaveCount(1);
      await expect(player).toHaveAttribute(
        'src',
        new RegExp(`youtube-nocookie\\.com/embed/${VIDEO}`),
      );
    });
  });
});
