import { expect, test } from '@playwright/test';

const newWorlds = [
  { title: 'Osmotic Glass', path: '/osmotic-glass', tool: 'Stir', metric: 'TRACER CROSSINGS' },
  { title: 'Mitotic Bloom', path: '/mitotic-bloom', tool: 'Focus cell', metric: 'FOCUSED PHASE' },
  {
    title: 'Hyphal Network',
    path: '/hyphal-network',
    tool: 'Food patch',
    metric: 'CYTOPLASMIC FLOW',
  },
  { title: 'Flagellar Drift', path: '/flagellar-drift', tool: 'Food bloom', metric: 'SWIMMERS' },
  { title: 'Membrane Tide', path: '/membrane-tide', tool: 'Swirl', metric: 'SEALED VESICLES' },
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
    await expect(page.locator('canvas.world-canvas')).toBeInViewport({ ratio: 0.45 });
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
    await page.getByRole('button', { name: 'Display', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle aquarium interaction' }).click();
    await expect(page.getByRole('group', { name: 'Interaction tool' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle aquarium interaction' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Exit aquarium' }).click();
    await expect(page.locator('.stage.aquarium')).toHaveCount(0);
  });
}

test('Aquarium Display presets, graph, and custom cards work in the shared worlds', async ({
  page,
}) => {
  await page.goto('/osmotic-glass');
  const opening = page.getByRole('button', { name: 'Open fullscreen aquarium' });
  await expect(opening).toBeInViewport();
  await opening.click();
  const cards = page.locator('dl[aria-label="Aquarium live statistics"] dt');
  const display = page.getByRole('button', { name: 'Display', exact: true });
  const panel = page.getByRole('region', { name: 'Aquarium display settings' });
  const graph = page.getByRole('region', { name: 'Aquarium live graph' });
  await display.press('Space');
  await expect(panel.getByRole('button', { name: 'Zen' })).toHaveAttribute('aria-pressed', 'true');
  await expect(cards).toHaveCount(0);
  await panel.getByRole('button', { name: 'Glance' }).click();
  await expect(cards).toHaveCount(2);
  await expect(graph).toHaveCount(0);
  await panel.getByRole('button', { name: 'Discover' }).click();
  await expect(cards).toHaveCount(4);
  await expect(graph).toBeVisible();
  await panel.getByRole('button', { name: /Live graph/ }).click();
  await expect(graph).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Discover' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Exit aquarium' }).click();
  await opening.click();
  await expect(cards).toHaveCount(4);
  await display.click();
  await panel.getByRole('button', { name: 'Zen' }).click();
  await expect(cards).toHaveCount(0);
});

test('a hard reload picks a different featured world with a live preview', async ({ page }) => {
  await page.goto('/');
  const launch = page.getByRole('link', { name: /^Launch / });
  await expect(launch.locator('canvas')).toBeVisible();
  const first = await launch.getAttribute('href');
  await page.reload();
  await expect(launch.locator('canvas')).toBeVisible();
  await expect(launch).not.toHaveAttribute('href', first ?? '');
  const next = await launch.getAttribute('href');
  await launch.click();
  await expect(page).toHaveURL((url) => url.pathname === next);
  await expect(page.locator('canvas.world-canvas')).toBeInViewport({ ratio: 0.45 });
  await page.goBack();
  await expect(launch).toHaveAttribute('href', next ?? '');
});

test('world footers link directly between both simulation layouts', async ({ page }) => {
  await page.goto('/ecosystem');
  const catalogue = page.getByRole('navigation', { name: 'World catalogue' });
  await expect(catalogue.getByRole('listitem')).toHaveCount(21);
  await expect(catalogue.getByRole('link', { name: 'Predator–Prey Evolution' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await catalogue.getByRole('link', { name: 'Mitotic Bloom' }).click();
  await expect(page).toHaveURL(/\/mitotic-bloom$/);
  await expect(page.locator('canvas.world-canvas')).toBeInViewport({ ratio: 0.45 });
  await expect(catalogue.getByRole('listitem')).toHaveCount(21);
  await expect(catalogue.getByRole('link', { name: 'Mitotic Bloom' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await catalogue.getByRole('link', { name: 'Hyphal Network' }).click();
  await expect(page).toHaveURL(/\/hyphal-network$/);
  await expect(page.locator('canvas.world-canvas')).toBeInViewport({ ratio: 0.45 });
});

test('Membrane Tide drops one pebble per press even if the pointer moves', async ({ page }) => {
  await page.goto('/membrane-tide');
  await page.getByRole('button', { name: 'Pebble', exact: true }).click();
  const canvas = page.locator('canvas.world-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected the membrane surface to be visible');
  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.64, bounds.y + bounds.height * 0.55, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.getByText(/Pebble impacts: 1$/)).toBeVisible();
});

test('Osmotic Glass adds retained solute only to the chamber that was tapped', async ({ page }) => {
  await page.goto('/osmotic-glass');
  await expect(page.getByText('14 / 72', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add solute', exact: true }).click();
  const canvas = page.locator('canvas.world-canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected to find the glass chamber');
  await canvas.click({ position: { x: bounds.width * 0.32, y: bounds.height * 0.52 } });
  await expect(page.getByText('32 / 72', { exact: true })).toBeVisible();
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
    '/membrane-tide',
    '/osmotic-glass',
    '/mitotic-bloom',
    '/hyphal-network',
    '/flagellar-drift',
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
  '/membrane-tide',
  '/osmotic-glass',
  '/mitotic-bloom',
  '/hyphal-network',
  '/flagellar-drift',
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

test('volume changes the actual mix and follows the user between views and worlds', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      override createDynamicsCompressor() {
        const compressor = super.createDynamicsCompressor();
        const analyser = super.createAnalyser();
        compressor.connect(analyser);
        // The monitor is parallel to the real output and produces no sound of its own.
        Object.assign(window, { mixAnalyser: analyser });
        return compressor;
      }
    };
  });
  await page.goto('/reef');
  const volume = page.getByRole('banner').getByRole('slider', { name: 'Sound volume' });
  await expect(volume).toHaveValue('75');
  await volume.press('Home');
  await expect(volume).toHaveValue('0');
  expect(await page.evaluate(() => 'mixAnalyser' in window)).toBe(false);
  await page.getByRole('button', { name: 'Toggle ambient sound' }).click();
  await expect(page.getByRole('button', { name: 'Toggle ambient sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const rms = () =>
    page.evaluate(() => {
      const analyser = (window as Window & { mixAnalyser?: AnalyserNode }).mixAnalyser;
      if (!analyser) return -1;
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length);
    });
  await expect.poll(rms).toBeGreaterThanOrEqual(0);
  await expect.poll(rms).toBeLessThan(0.0003);
  await volume.press('End');
  await expect(volume).toHaveValue('100');
  await expect.poll(rms).toBeGreaterThan(0.012);

  await page.getByRole('button', { name: 'Open fullscreen aquarium' }).click();
  const aquariumVolume = page
    .locator('.aquarium-toolbar')
    .getByRole('slider', { name: 'Sound volume' });
  await expect(aquariumVolume).toHaveValue('100');
  await aquariumVolume.press('ArrowLeft');
  await expect(aquariumVolume).toHaveValue('99');
  await page.getByRole('button', { name: 'Exit aquarium' }).click();
  await expect(aquariumVolume).toHaveCount(0);
  await expect(volume).toHaveValue('99');

  await page.goto('/hyphal-network');
  await expect(volume).toHaveValue('99');
  await expect(page.getByRole('button', { name: 'Toggle ambient sound' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
