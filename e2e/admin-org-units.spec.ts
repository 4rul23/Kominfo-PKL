import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, randomSuffix } from "./helpers";

test("admin can create org unit and update lead contact", async ({ page }) => {
  const suffix = randomSuffix();
  const code = `QA_UNIT_${suffix.toUpperCase()}`;
  const name = `QA Unit ${suffix}`;
  const leadName = `Lead ${suffix}`;

  await loginAsAdmin(page);
  await page.goto("/admin/org-units");

  await page.getByPlaceholder(/CODE/).fill(code);
  await page.getByPlaceholder("Nama Org Unit").fill(name);
  await page.getByRole("button", { name: /^Tambah$/ }).click();

  const row = page.locator("tr").filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByPlaceholder("Nama lead").fill(leadName);
  await row.getByPlaceholder("Nama lead").blur();
  await row.getByPlaceholder(/08xxx/).fill("081234567890");
  await row.getByPlaceholder(/08xxx/).blur();

  await dismissVisibleToasts(page);
  await page.getByRole("button", { name: /Refresh/i }).click();
  const refreshedRow = page.locator("tr").filter({ hasText: code });
  await expect(refreshedRow).toBeVisible({ timeout: 15000 });
  await expect(refreshedRow.locator("input").first()).toHaveValue(leadName);
});
