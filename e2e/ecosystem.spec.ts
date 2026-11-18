import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('catalogue navigates to the ecosystem and renders its Canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Predator–Prey Evolution' })).toBeVisible();
  await page.locator('.wl-world-card').first().click();
  await expect(page).toHaveURL(/\/ecosystem$/);
  await expect(page.locator('canvas.world-canvas')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Experiment controls' })).toBeVisible();
});

test('pause, playback speed and Aquarium settings work in a real browser', async ({ page }) => {
  await page.goto('/ecosystem');
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.getByRole('button', { name: /Resume/ })).toBeVisible();
  await page.getByRole('button', { name: /Resume/ }).click();
  await page.getByRole('button', { name: 'Change simulation speed' }).click();
  await expect(page.getByRole('button', { name: 'Change simulation speed' })).toContainText('2×');

  await page.getByRole('button', { name: 'Open fullscreen aquarium' }).click();
  await expect(page.locator('.world-frame.aquarium-active')).toBeVisible();
  await page.getByRole('button', { name: /Display/ }).click();
  await expect(page.getByRole('region', { name: 'Aquarium display settings' })).toBeVisible();
  await page.getByRole('button', { name: /Discover/ }).click();
  await page.getByRole('button', { name: /Exit/ }).click();
  await expect(page.locator('.world-frame.aquarium-active')).toHaveCount(0);
});

test('seed, interaction, JSON download, file import and verified replay', async ({ page }) => {
  await page.goto('/ecosystem');
  await page.getByLabel('Seed', { exact: true }).fill('12345');
  await page.getByLabel('Grazers', { exact: true }).fill('15');
  await page.getByLabel('Hunters', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Start configured world' }).click();
  await expect(page.getByRole('status')).toContainText('deterministic experiment started');

  // The welcome overlay otherwise obscures the interactive canvas.
  await page.getByRole('button', { name: 'Show instructions' }).click();
  await page.locator('.world-canvas').click({ position: { x: 330, y: 210 } });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save experiment' }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.format).toBe('wild-life-experiment');
  expect(exported.config).toEqual({ seed: 12345, prey: 15, predators: 2 });
  expect(exported.interventions.some((event: { kind: string }) => event.kind === 'bloom')).toBe(
    true,
  );
  expect(exported.checksum).toMatch(/^[0-9a-f]{8}$/);

  await page.getByRole('button', { name: 'Start configured world' }).click();
  await page.locator('input[aria-label="Experiment JSON file"]').setInputFiles({
    name: 'sample-experiment.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.getByRole('status')).toContainText('Replay verified', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Resume/ })).toBeVisible();
  await expect(page.getByText(/Imported: \d+ grazers/)).toBeVisible();

  await page.getByRole('button', { name: 'Replay experiment' }).click();
  await expect(page.getByRole('status')).toContainText('Replay verified', { timeout: 30_000 });
});

test('invalid or incompatible imported experiment cannot replace the current world', async ({
  page,
}) => {
  await page.goto('/ecosystem');
  await page.getByLabel('Seed', { exact: true }).fill('4242');
  await page.getByRole('button', { name: 'Start configured world' }).click();
  await page.locator('input[aria-label="Experiment JSON file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'wild-life-experiment', version: 99 })),
  });
  await expect(page.getByRole('status')).toContainText('Unsupported experiment file format');
  await expect(page.getByLabel('Seed', { exact: true })).toHaveValue('4242');
});

test('mobile layout keeps the experiment inputs and simulation accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ecosystem');
  await expect(page.getByRole('region', { name: 'Experiment controls' })).toBeVisible();
  await page.getByRole('button', { name: 'Start configured world' }).click();
  await expect(page.getByRole('status')).toContainText('deterministic experiment started');
  await expect(page.locator('canvas.world-canvas')).toBeVisible();
});
