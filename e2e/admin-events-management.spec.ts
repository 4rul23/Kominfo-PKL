import { expect, test } from "@playwright/test";

import { loginAsAdmin, randomSuffix } from "./helpers";

test("admin can create event and open QR register modal", async ({ page }) => {
  const suffix = randomSuffix();
  const eventCode = `qa_event_${suffix}`;
  const eventName = `QA Event ${suffix}`;

  await loginAsAdmin(page);
  await page.goto("/admin/events");

  await page.getByPlaceholder(/Code event/).fill(eventCode);
  await page.getByPlaceholder("Nama event").fill(eventName);
  await page.getByLabel(/Jadikan event aktif/i).uncheck();
  await page.getByRole("button", { name: /Simpan Event/i }).click();

  const row = page.locator("tr").filter({ hasText: eventName });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole("button", { name: /Buat QR Register/i }).click();
  await expect(page.getByText(/QR Register Event/i)).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: eventCode }).first()).toBeVisible();
  await page.getByRole("button", { name: /Tutup QR/i }).click();
});
