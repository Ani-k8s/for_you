import { test, expect } from '@playwright/test';

test.describe('Gym Owner Journey', () => {
  // Use a unique suffix for the gym to avoid conflicts if run multiple times
  const uniqueId = Date.now();
  const subdomain = `gym-test`;
  const ownerEmail = `owner${uniqueId}@gymtest.com`;
  const memberEmail = `member${uniqueId}@gymtest.com`;

  test('Complete End-to-End Flow', async ({ page }) => {
    const gymName = `Test Gym ${uniqueId}`;
    const targetSubdomain = `gym${uniqueId}`;
    const ownerPassword = 'Password123!';

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
    console.log(`Using baseURL: ${baseURL}`);

    // 1. Open UI and Register Gym Request
    await page.goto(`${baseURL}/register`);
    await expect(page.locator('h1')).toContainText('Start Your Gym', { timeout: 15000 });

    await page.fill('input[name="name"]', gymName);
    await page.fill('input[name="subdomain"]', targetSubdomain);
    await page.fill('input[name="owner_name"]', 'Test Owner');
    await page.fill('input[name="owner_email"]', ownerEmail);
    await page.fill('input[name="phone"]', '1234567890');

    await page.click('button[type="submit"]');
    await expect(page.locator('h2')).toContainText('Registration Received', { timeout: 15000 });

    // 2. Login as Super Admin to Approve
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', 'admin@foryougym.com');
    await page.fill('input[name="password"]', 'Admin@123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to Super Admin Dashboard
    await expect(page).toHaveURL(/\/dashboard\/super-admin/);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find our request and approve it
    console.log(`Looking for request for gym: ${gymName}`);
    const requestCard = page.locator('h3', { hasText: gymName }).locator('xpath=ancestor::div[contains(@class, "glass-panel")]').first();
    await expect(requestCard).toBeVisible({ timeout: 15000 });
    
    // 1. Click "Approve Gym" to open password field
    await requestCard.getByRole('button', { name: /Approve Gym/i }).first().click();
    
    // 2. Fill password
    await requestCard.locator('input[placeholder*="password"]').first().fill(ownerPassword);
    
    // 3. Click "Confirm"
    await requestCard.getByRole('button', { name: /Confirm/i }).first().click();
    
    // Wait for approval success
    await expect(page.locator('body')).toContainText('Gym approved and created!');

    // 3. Login as Owner on the Tenant Subdomain
    // Use the same port as baseURL, which is typically 8080 or process.env.PLAYWRIGHT_BASE_URL port
    const portMatch = baseURL.match(/:(\d+)$/);
    const portSuffix = portMatch ? `:${portMatch[1]}` : '';
    const tenantUrl = `http://${targetSubdomain}.foryou${portSuffix}/`;
    
    await page.goto(tenantUrl);
    
    // Verify we are on the tenant login page
    // The h1 now displays the gym name in the branded UI
    await expect(page.locator('h1')).toContainText(gymName);
    
    await page.fill('input[name="email"]', ownerEmail);
    await page.fill('input[name="password"]', ownerPassword);
    await page.click('button[type="submit"]');

    // 4. Verify Owner Dashboard
    await expect(page).toHaveURL(/\/dashboard\/owner/);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 15000 });

    // 5. Create a Member (Sanity Check)
    await page.click('a[href="/members"]');
    await expect(page.getByRole('heading', { name: /Nexus Members/i })).toBeVisible({ timeout: 15000 });
    
    // Add Member
    await page.click('button:has-text("Add Member")');
    await page.fill('input[name="memberEmail"]', memberEmail);
    await page.fill('input[name="memberPassword"]', 'Member@123!');
    
    // Plan is already selected by default (first plan)
    
    await page.click('button:has-text("Initialize Member")');
    
    await expect(page.locator('text=Member created')).toBeVisible();
  });
});
