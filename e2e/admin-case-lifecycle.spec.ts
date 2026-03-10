import { expect, test } from "@playwright/test";

import { loginAsOperator, loginAsReceptionist, randomSuffix } from "./helpers";

test("resepsionis can assign guest case and operator can work it from inbox", async ({ browser, page }) => {
  test.setTimeout(120000);
  const suffix = randomSuffix();
  const visitorName = `Lifecycle Visitor ${suffix}`;

  await page.goto("/guest");
  await page.getByPlaceholder("Nama Lengkap...").fill(visitorName);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("PT / Dinas / Umum...").fill(`PT Lifecycle ${suffix}`);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("Kepala Bidang / Staff...").fill("Staff QA");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("19700101... atau 7371...").fill(`7371${suffix}`);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: /UPT Warroom/i }).click();
  await page.getByPlaceholder("Makassar, Gowa...").fill("Makassar");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Sulawesi Selatan" }).click();
  await page.getByPlaceholder("Koordinasi / Konsultasi...").fill(`Case lifecycle ${suffix}`);
  await page.getByPlaceholder("123/DK/2026").fill(`LC/${suffix}/2026`);
  await page.getByRole("button", { name: "Simpan Data" }).click();
  await expect(page.getByText(visitorName)).toBeVisible();

  const recepContext = await browser.newContext();
  const recepPage = await recepContext.newPage();
  await loginAsReceptionist(recepPage);
  await recepPage.goto("/admin/intake");
  await recepPage.getByRole("button", { name: "Refresh" }).click();
  const intakeRow = recepPage.locator("tr").filter({ hasText: /visitor/i }).first();
  await expect(intakeRow).toBeVisible({ timeout: 15000 });
  await intakeRow.getByRole("link", { name: /Buka/i }).click();

  await expect(recepPage.getByRole("heading", { name: new RegExp(`Kunjungan: ${visitorName}`) })).toBeVisible();
  await recepPage.getByRole("combobox").nth(0).selectOption({ label: "UPT Warroom" });
  await recepPage.getByRole("combobox").nth(1).selectOption({ label: "Operator UPT Warroom" });
  await recepPage.getByRole("button", { name: /Assign Operator/i }).click();
  await expect(recepPage.getByText(/Assigned to:/)).toContainText(/Operator UPT Warroom/i);
  await recepContext.close();

  const opContext = await browser.newContext();
  const opPage = await opContext.newPage();
  await loginAsOperator(opPage);
  await opPage.goto("/admin/inbox");
  await opPage.getByRole("button", { name: "Refresh" }).click();
  const inboxRow = opPage.locator("tr").filter({ hasText: visitorName });
  await expect(inboxRow).toBeVisible({ timeout: 15000 });
  await inboxRow.getByRole("link", { name: /Buka/i }).click();

  await expect(opPage.getByText(visitorName)).toBeVisible();
  await opPage.getByRole("combobox").nth(3).selectOption("acknowledged");
  await opPage.getByRole("button", { name: /^Update$/ }).click();
  await expect(opPage.locator("span").filter({ hasText: /^acknowledged$/ }).first()).toBeVisible();
  await opPage.getByPlaceholder("Tambah catatan...").fill(`Note ${suffix}`);
  await opPage.getByRole("button", { name: /Simpan Catatan/i }).click();
  await expect(opPage.getByText(`Note ${suffix}`)).toBeVisible();
  await opContext.close();
});
