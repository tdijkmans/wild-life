import { expect, test } from '@playwright/test';

const newWorlds = [
  { title: 'Pollen Paths', path: '/pollen-paths', tool: 'Sunlight', metric: 'POLLEN DELIVERIES' },
  { title: 'Night Chorus', path: '/night-chorus', tool: 'Warmth', metric: 'UNANSWERED SIGNALS' },
  {
    title: 'Silver Shoals',
    path: '/silver-shoals',
    tool: 'Tidal current',
    metric: 'HYBRID HATCHES',
  },
  { title: 'Neuroplasticity', path: '/neuroplasticity', tool: 'Stimulus', metric: 'SYNAPSES' },
  { title: 'Morphogenesis', path: '/morphogenesis', tool: 'Growth factor', metric: 'PROGENITORS' },
  {
    title: 'Chromatic Commons',
    path: '/chromatic-commons',
    tool: 'Mixing current',
    metric: 'LIKE NEIGHBORS',
  },
  { title: 'Island Evolution', path: '/island-evolution', tool: 'Passage', metric: 'DIVERGENCE' },
  {
    title: 'Vascular Garden',
    path: '/vascular-garden',
    tool: 'Metabolic demand',
    metric: 'OXYGENATION',
  },
  { title: 'Murmuration', path: '/murmuration', tool: 'Thermal', metric: 'STARLINGS' },
  { title: 'Defensive Herd', path: '/defensive-herd', tool: 'Scent', metric: 'GUARDIANS' },
  { title: 'Canopy', path: '/canopy', tool: 'Rain', metric: 'FOLIAGE' },
  { title: 'Abyssal Bloom', path: '/abyssal-bloom', tool: 'Upwelling', metric: 'PHYTOPLANKTON' },
  { title: 'Synchrony', path: '/synchrony', tool: 'Warmth', metric: 'FIREFLIES' },
  { title: 'Reef', path: '/reef', tool: 'Cool water', metric: 'CORAL BRANCHES' },
  { title: 'Microbial Commons', path: '/microbial-commons', tool: 'Oxygen', metric: 'PRODUCERS' },
] as const;

for (const world of newWorlds) {
  test(`${world.title}: catalogue navigation and active Canvas world`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.goto('/');
    await page.locator('.wl-world-card').filter({ hasText: world.title }).click();
    await expect(page).toHaveURL(new RegExp(`${world.path}$`));
    await expect(page.getByRole('heading', { name: new RegExp(world.title) })).toBeVisible();
    await expect(page.locator('canvas.world-canvas')).toBeVisible();
    await expect(page.getByRole('region', { name: 'World controls' })).toBeVisible();
    await expect(page.getByText(world.metric, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: world.tool, exact: true }).click();
    await page.locator('canvas.world-canvas').click({ position: { x: 230, y: 170 } });
    await expect(page.getByRole('button', { name: world.tool })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(runtimeErrors).toEqual([]);
  });

  test(`${world.title}: pause, speed, seeded restart and immersive Aquarium`, async ({ page }) => {
    await page.goto(world.path);
    await page.getByRole('button', { name: 'Pause or resume simulation' }).click();
    await expect(page.getByRole('button', { name: 'Pause or resume simulation' })).toContainText(
      'Resume',
    );
    await page.getByRole('button', { name: 'Pause or resume simulation' }).click();
    await page.getByRole('button', { name: 'Change simulation speed' }).click();
    await expect(page.getByRole('button', { name: 'Change simulation speed' })).toContainText('2×');
    await page.getByLabel('Seed', { exact: true }).fill('48502');
    await page.getByRole('button', { name: 'Restart from seed' }).click();
    await expect(page.getByRole('status')).toContainText('seed 48502');

    await page.getByRole('button', { name: 'Open fullscreen aquarium' }).click();
    await expect(page.locator('.stage.aquarium')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle aquarium interaction' }).click();
    await expect(page.getByRole('button', { name: 'Toggle aquarium interaction' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Exit aquarium' }).click();
    await expect(page.locator('.stage.aquarium')).toHaveCount(0);
  });
}

test('Aquarium statistics cycle through none, few and all, and remember the selection on re-entry', async ({
  page,
}) => {
  for (const route of ['/reef', '/pollen-paths', '/night-chorus', '/silver-shoals']) {
    await page.goto(route);
    const opening = page.getByRole('button', { name: 'Open fullscreen aquarium' });
    await opening.click();
    const stats = page.locator('dl[aria-label="Aquarium live statistics"]');
    await expect(stats).toHaveCount(0);
    await page.getByRole('button', { name: 'Stats: None' }).press('Space');
    await expect(stats.locator('dt')).toHaveCount(2);
    await page.getByRole('button', { name: 'Stats: Few' }).click();
    const metricCount = await page
      .getByRole('region', { name: 'World observations' })
      .locator('.metric')
      .count();
    await expect(stats.locator('dt')).toHaveCount(metricCount);
    await page.getByRole('button', { name: 'Exit aquarium' }).click();
    await opening.click();
    await expect(stats.locator('dt')).toHaveCount(metricCount);
    await page.getByRole('button', { name: 'Stats: All' }).click();
    await expect(stats).toHaveCount(0);
  }
});

test('mobile viewport keeps every shared world and environmental controls usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/neuroplasticity',
    '/morphogenesis',
    '/chromatic-commons',
    '/island-evolution',
    '/vascular-garden',
    '/pollen-paths',
    '/night-chorus',
    '/silver-shoals',
    '/murmuration',
    '/defensive-herd',
    '/canopy',
    '/abyssal-bloom',
    '/synchrony',
    '/reef',
    '/microbial-commons',
  ]) {
    await page.goto(route);
    await expect(page.locator('canvas.world-canvas')).toBeVisible();
    await expect(page.getByRole('region', { name: 'World controls' })).toBeVisible();
    await page.getByRole('button', { name: 'Open fullscreen aquarium' }).click();
    await expect(page.locator('.stage.aquarium')).toBeVisible();
    await page.getByRole('button', { name: 'Exit aquarium' }).click();
    await expect(page.locator('.stage.aquarium')).toHaveCount(0);
  }
});

for (const route of [
  '/murmuration',
  '/defensive-herd',
  '/neuroplasticity',
  '/morphogenesis',
  '/chromatic-commons',
  '/island-evolution',
  '/vascular-garden',
  '/pollen-paths',
  '/night-chorus',
  '/silver-shoals',
  '/canopy',
  '/abyssal-bloom',
  '/synchrony',
  '/reef',
  '/microbial-commons',
]) {
  test(`${route}: sound is opt-in, user-mutable and available inside Aquarium`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    const toggle = page.getByRole('button', { name: 'Toggle ambient sound' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Open fullscreen aquarium' }).click();
    const aquariumToggle = page.getByRole('button', { name: 'Toggle aquarium sound' });
    await expect(aquariumToggle).toHaveAttribute('aria-pressed', 'true');
    await aquariumToggle.click();
    await expect(aquariumToggle).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Exit aquarium' }).click();
    expect(errors).toEqual([]);
  });
}
