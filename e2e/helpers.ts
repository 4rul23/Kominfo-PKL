import { expect, type Page } from "@playwright/test";

export function randomTrackingId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const serial = String(Math.floor(1000 + Math.random() * 8999));
  return `TRK-${yyyy}-${mm}-${serial}`;
}

export function tinyPngBuffer(): Buffer {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5M4f8AAAAASUVORK5CYII=";
  return Buffer.from(base64, "base64");
}

export function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export async function dismissVisibleToasts(page: Page): Promise<void> {
  const closeButtons = page.locator('button[title="Dismiss"]');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i += 1) {
    const button = closeButtons.nth(i);
    if (await button.isVisible().catch(() => false)) {
      await button.click({ force: true });
    }
  }
}

export async function loginAsStaff(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/admin");
  await page.getByPlaceholder("admin").fill(username);
  await page.getByPlaceholder("••••••••").fill(password);

  const loginResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/auth/login") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Sign In" }).click();

  const loginResponse = await loginResponsePromise;
  const loginText = await loginResponse.text();
  expect(loginResponse.ok(), `Admin login failed: ${loginResponse.status()} ${loginText}`).toBeTruthy();

  await expect(page).toHaveURL(/\/admin(\/.*)?$/);
  await page.waitForFunction(() => Boolean(window.sessionStorage.getItem("diskominfo_staff_session")), undefined, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible({ timeout: 15000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsStaff(page, "admin", "admin123");
}

export async function loginAsReceptionist(page: Page): Promise<void> {
  await loginAsStaff(page, "resepsionis", "reseps123");
}

export async function loginAsOperator(page: Page): Promise<void> {
  await loginAsStaff(page, "operator-upt", "op123");
}
