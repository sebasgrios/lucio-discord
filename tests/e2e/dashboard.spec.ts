import { expect, test } from '@playwright/test';

test('presenta Lucio y permite iniciar la instalación o el acceso', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Tu servidor ya tiene conversación. Ponle ritmo.' }),
  ).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/assets/lucio-icon.jpg');

  const install = page.getByRole('link', { name: 'Añadir Lucio', exact: true });
  await expect(install).toHaveAttribute('href', '/invite');
  await install.focus();
  await expect(install).toBeFocused();

  await expect(page.getByRole('link', { name: 'Acceder' })).toHaveAttribute(
    'href',
    '/auth/discord',
  );
  await expect(page.getByText('Sin analítica ni cookies publicitarias')).toBeVisible();
});

test('publica la información de privacidad', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByRole('heading', { name: 'Privacidad' })).toBeVisible();
  await expect(page.getByText(/No utilizamos analítica/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
});

test('adapta la landing a una pantalla móvil', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Tu servidor ya tiene conversación. Ponle ritmo.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Añadir Lucio', exact: true })).toBeVisible();
});
