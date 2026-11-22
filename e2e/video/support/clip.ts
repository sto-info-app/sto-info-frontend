import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  Browser,
  BrowserContext,
  Locator,
  Page,
  TestInfo,
  expect,
} from '@playwright/test';

import { FleetRole, fleetStateOf } from '../../support/fleet-people';

/**
 * Recording a help video (13 October 2026).
 *
 * A clip is a browser context with Playwright's recording switched on, at
 * YouTube's 1920 by 1080, signed in as one of the people fleet-setup made.
 * What a viewer needs and a test does not is added here: a cursor, since a
 * recording shows none; a caption bar, since the recording is silent; and
 * every action slowed to a pace that can be followed.
 */

/** Where the finished clips go: under reports, beside the screenshots. */
export const VIDEO_DIR = resolve('reports/recordings');

/** Where a clip is written while it records. Under reports, which git ignores. */
const RECORDING_DIR = resolve('reports/recordings/.recording');

/** YouTube's 16:9 at 1080p. */
const SIZE = { width: 1920, height: 1080 };

/** How long the cursor takes to cross to a target, in mouse steps. */
const GLIDE_STEPS = 30;

/** The pause between one keystroke and the next, in milliseconds. */
const KEY_DELAY_MS = 90;

/**
 * Draws a cursor that follows the mouse, since a recording shows the real
 * one nowhere. Run before any of the page's own scripts, on every page the
 * context opens. It listens on the document, so it survives Angular
 * replacing the body's content.
 */
const CURSOR_SCRIPT = `
(() => {
  const draw = () => {
    if (document.getElementById('video-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'video-cursor';
    cursor.innerHTML =
      '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.5 L11.5 14 L17.5 14 Z"' +
      ' fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '</svg>';
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'transform 0.1s ease',
      transform: 'translate(-5px, -3px)',
    });
    document.documentElement.appendChild(cursor);
    document.addEventListener('mousemove', event => {
      cursor.style.opacity = '1';
      cursor.style.left = event.clientX + 'px';
      cursor.style.top = event.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-5px, -3px) scale(0.8)';
    }, true);
    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-5px, -3px)';
    }, true);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', draw);
  } else {
    draw();
  }
})();
`;

/**
 * Finds the ffmpeg Playwright installs beside its browsers, which is what
 * writes the recording in the first place. Nothing else on the machine is
 * assumed.
 *
 * @returns Its path, or null when it is not there.
 */
function playwrightFfmpeg(): string | null {
  const browsers =
    process.env['PLAYWRIGHT_BROWSERS_PATH'] ??
    (process.platform === 'win32'
      ? join(process.env['LOCALAPPDATA'] ?? '', 'ms-playwright')
      : process.platform === 'darwin'
        ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright'));
  const binary =
    process.platform === 'win32'
      ? 'ffmpeg-win64.exe'
      : process.platform === 'darwin'
        ? 'ffmpeg-mac'
        : 'ffmpeg-linux';

  if (!existsSync(browsers)) {
    return null;
  }

  const found = readdirSync(browsers)
    .filter(entry => entry.startsWith('ffmpeg-'))
    .sort()
    .reverse()
    .map(entry => join(browsers, entry, binary))
    .find(path => existsSync(path));

  return found ?? null;
}

/**
 * Cuts the opening seconds off a clip: the blank frames before the first
 * page was drawn. Written again by ffmpeg, since cutting without re-encoding
 * can only start at a keyframe.
 *
 * @param path - The clip, replaced in place.
 * @param seconds - How much to cut.
 * @returns Whether it was cut.
 */
function trimOpening(path: string, seconds: number): boolean {
  const ffmpeg = playwrightFfmpeg();

  if (ffmpeg === null || seconds <= 0) {
    return false;
  }

  const trimmed = `${path}.trim.webm`;
  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      seconds.toFixed(3),
      '-i',
      path,
      '-c:v',
      'libvpx',
      // Near the rate Playwright recorded at, so the file stays about as big.
      '-b:v',
      '1200k',
      '-an',
      trimmed,
    ],
    { stdio: 'inherit' },
  );

  if (result.status !== 0 || !existsSync(trimmed)) {
    return false;
  }

  unlinkSync(path);
  renameSync(trimmed, path);

  return true;
}

/** A recording in progress. */
export interface Clip {
  readonly page: Page;
  readonly context: BrowserContext;
  /**
   * Marks where the clip begins: call it once the first page is on screen.
   * The recording starts the moment the page is made, on a blank frame, and
   * whatever was recorded before this call is cut off when the clip is
   * finished.
   */
  start(): void;
  /**
   * Ends the recording and keeps it.
   *
   * @param name - The file's name, without its extension.
   * @returns Where the clip was written.
   */
  finish(name: string): Promise<string>;
}

/**
 * Opens a page to record, as somebody or as nobody.
 *
 * @param browser - The project's browser.
 * @param info - The test, for the project's address.
 * @param role - Who is signed in, or null for nobody.
 * @returns The clip.
 */
export async function openClip(
  browser: Browser,
  info: TestInfo,
  role: FleetRole | null,
): Promise<Clip> {
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: SIZE,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    storageState: role === null ? undefined : fleetStateOf(role),
    recordVideo: { dir: RECORDING_DIR, size: SIZE },
  });

  await context.addInitScript(CURSOR_SCRIPT);

  const page = await context.newPage();
  const openedAt = Date.now();

  let startedAt: number | null = null;

  return {
    page,
    context,
    start(): void {
      startedAt ??= Date.now();
    },
    async finish(name: string): Promise<string> {
      const video = page.video();

      // A recording is written out only once its context closes.
      await context.close();

      if (video === null) {
        throw new Error('The clip was opened without a recording.');
      }

      const path = resolve(VIDEO_DIR, `${name}.webm`);

      mkdirSync(VIDEO_DIR, { recursive: true });
      await video.saveAs(path);
      await video.delete();

      if (startedAt !== null) {
        const cut = (startedAt - openedAt) / 1_000;

        if (!trimOpening(path, cut)) {
          console.warn(
            `The first ${cut.toFixed(1)}s of ${name} were not cut: Playwright's ffmpeg was not found or failed.`,
          );
        }
      }

      return path;
    },
  };
}

/**
 * Makes the clip's page somebody else's, in place: the site keeps a session
 * in local storage alone, so theirs is written over the current one and the
 * page loaded again. A cut in the clip, for the viewer, from one side of a
 * conversation to the other.
 *
 * @param page - The clip's page.
 * @param role - Who it becomes, or null for nobody: signed out.
 */
export async function becomeRole(
  page: Page,
  role: FleetRole | null,
): Promise<void> {
  const entries =
    role === null
      ? []
      : (
          JSON.parse(readFileSync(fleetStateOf(role), 'utf8')) as {
            origins: {
              origin: string;
              localStorage: { name: string; value: string }[];
            }[];
          }
        ).origins.flatMap(origin => origin.localStorage);

  await page.evaluate(stored => {
    localStorage.clear();

    for (const { name, value } of stored) {
      localStorage.setItem(name, value);
    }
  }, entries);
  await page.reload();
}

/**
 * Reads whatever notices somebody has, off camera, so the header's unread
 * count does not stand through their clip. Through the page, as they would.
 *
 * @param page - A page of theirs that is not being recorded.
 */
export async function readNotices(page: Page): Promise<void> {
  await page.goto('/notifications');

  const markAll = page.getByRole('button', { name: 'Mark all read' });

  if (await markAll.isVisible()) {
    await markAll.click();
    await expect(markAll).toBeHidden();
  }
}

/**
 * Holds the picture still, for the viewer to read it.
 *
 * @param page - The page.
 * @param ms - For how long.
 */
export const pause = (page: Page, ms: number): Promise<void> =>
  page.waitForTimeout(ms);

/**
 * Moves the cursor onto something, at a pace the eye can follow, and rests
 * there a moment.
 *
 * @param page - The page.
 * @param target - What to move onto.
 */
export async function glide(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await pause(page, 300);

  const box = await target.boundingBox();

  if (box === null) {
    throw new Error('The target is not on the page.');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: GLIDE_STEPS,
  });
  await pause(page, 400);
}

/**
 * Glides onto something and clicks it.
 *
 * @param page - The page.
 * @param target - What to click.
 */
export async function click(page: Page, target: Locator): Promise<void> {
  await glide(page, target);
  await target.click();
  await pause(page, 700);
}

/**
 * Clicks into a box and types as a person would.
 *
 * @param page - The page.
 * @param target - The box.
 * @param text - What to type.
 */
export async function typeInto(
  page: Page,
  target: Locator,
  text: string,
): Promise<void> {
  await click(page, target);
  await target.pressSequentially(text, { delay: KEY_DELAY_MS });
  await pause(page, 500);
}

/**
 * Clicks into a box that already says something, and types over it.
 *
 * @param page - The page.
 * @param target - The box.
 * @param text - What to type instead.
 */
export async function replaceInto(
  page: Page,
  target: Locator,
  text: string,
): Promise<void> {
  await click(page, target);
  await target.selectText();
  await pause(page, 400);
  await target.pressSequentially(text, { delay: KEY_DELAY_MS });
  await pause(page, 500);
}

/**
 * Glides onto a drop-down and picks one of its choices. A headless browser
 * draws no list, so the viewer sees the choice change in place.
 *
 * @param page - The page.
 * @param target - The drop-down.
 * @param label - The choice, as it reads.
 */
export async function choose(
  page: Page,
  target: Locator,
  label: string,
): Promise<void> {
  await glide(page, target);
  await target.selectOption({ label });
  await pause(page, 1_000);
}

/**
 * Says what the viewer is looking at, on a bar at the foot of the picture.
 * Set again after each navigation, since the page is drawn afresh. An empty
 * caption takes the bar away.
 *
 * @param page - The page.
 * @param text - The caption.
 */
export async function caption(page: Page, text: string): Promise<void> {
  await page.evaluate(words => {
    let bar = document.getElementById('video-caption');

    if (bar === null) {
      bar = document.createElement('div');
      bar.id = 'video-caption';
      Object.assign(bar.style, {
        position: 'fixed',
        left: '50%',
        bottom: '40px',
        transform: 'translateX(-50%)',
        maxWidth: '1500px',
        padding: '14px 32px',
        borderRadius: '28px',
        background: 'rgba(0, 0, 0, 0.86)',
        border: '2px solid #ff9966',
        color: '#ff9966',
        font: '700 32px/1.25 Antonio, "Arial Narrow", sans-serif',
        letterSpacing: '0.02em',
        textAlign: 'center',
        zIndex: '2147483646',
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
      });
      document.documentElement.appendChild(bar);
    }

    bar.textContent = words;
    bar.style.opacity = words === '' ? '0' : '1';
  }, text);
  await pause(page, 600);
}
