import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, randomSuffix } from "./helpers";

test("admin-created operator appears in directory", async ({ browser, page }) => {
  test.setTimeout(90000);
  const suffix = randomSuffix();
  const username = `op-${suffix}`;
  const displayName = `Operator QA ${suffix}`;

  await loginAsAdmin(page);
  await page.goto("/admin/users");

  const usernameInput = page.getByPlaceholder("Username (login)");
  await usernameInput.fill(username);
  await page.getByPlaceholder("Nama").fill(displayName);
  await page.getByPlaceholder("NIP/NIK").fill(`1988${suffix}`);
  await page.getByPlaceholder("WhatsApp (08xxx / +62xxx)").fill("081234567890");
  await page.getByPlaceholder("Password").fill("op123456");
  await page.getByRole("button", { name: "Tambah User" }).click();
  await dismissVisibleToasts(page);
  await page.getByRole("button", { name: "Refresh" }).click();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await loginAsAdmin(secondPage);
  await secondPage.goto("/admin/directory");
  await secondPage.getByText(/Direktori Kontak/).waitFor({ timeout: 15000 });
  await secondPage.getByPlaceholder("Cari nama, org unit, atau WA...").fill(displayName);
  await expect(secondPage.getByRole("cell", { name: displayName })).toBeVisible();
  await secondContext.close();
});
