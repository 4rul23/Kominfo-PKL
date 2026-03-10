import { expect, test } from "@playwright/test";

test("attendance gateway shows events and opens event registration", async ({ page }) => {
  await page.goto("/attendance");

  await expect(page.getByRole("heading", { name: "Pilih Event untuk Mulai Absensi" })).toBeVisible();
  await expect(page.locator("text=Code:").first()).toBeVisible();

  const firstButton = page.getByRole("link", { name: /Mulai Absen Event Ini/i }).first();
  const href = await firstButton.getAttribute("href");
  expect(href).toBeTruthy();
  await firstButton.click();

  await page.waitForURL(`**${href}`, { timeout: 20000 });
  await expect(page).toHaveURL(/\/e\/.+\/register/);
  await expect(page.getByRole("heading", { name: /Nama Lengkap Peserta/i })).toBeVisible();
});
