import { test, expect } from '@playwright/test';

test('Fresh Onboarding Flow: Super Admin creates a Gym', async ({ page }) => {
  // 1. Login as Super Admin
  await page.goto('http://localhost:8080/login');
  await page.fill('input[type="email"]', 'admin@foryougym.com');
  await page.fill('input[type="password"]', 'Admin@123!');
  await page.click('button[type="submit"]');

  // Verify redirected to super admin dashboard
  await expect(page).toHaveURL(/.*super-admin/);
  await expect(page.locator('h1')).toContainText('Nexus Overlord');

  // 2. Go to Gyms page
  await page.click('a[href="/gyms"]');
  await expect(page.locator('h1')).toContainText('Nexus Registry');

  // 3. Create a new Gym
  await page.click('button:has-text("Onboard New Gym")');
  
  const gymName = 'Elite Fitness ' + Math.floor(Math.random() * 1000);
  const subdomain = 'elite' + Math.floor(Math.random() * 1000);
  
  await page.fill('placeholder="Titan Fitness"', gymName);
  await page.fill('placeholder="titan-core"', subdomain);
  await page.fill('placeholder="Capt. John Doe"', 'Gym Owner');
  await page.fill('placeholder="john@titan.env"', `owner@${subdomain}.com`);
  await page.fill('placeholder="••••••••••••"', 'Owner@123!');
  
  await page.click('button:has-text("INITIALIZE SYSTEM")');

  // 4. Verify gym appears in the list
  await expect(page.locator('table')).toContainText(gymName);
  await expect(page.locator('table')).toContainText(subdomain);
});
