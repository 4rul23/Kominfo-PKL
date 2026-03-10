import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, randomSuffix } from "./helpers";

test("guest registration becomes visible in admin visitors and intake", async ({ browser, page }) => {
  test.setTimeout(90000);
  const suffix = randomSuffix();
  const visitorName = `QA Visitor ${suffix}`;
  const organization = `PT QA ${suffix}`;

  await page.goto("/guest");
  await page.getByPlaceholder("Nama Lengkap...").fill(visitorName);
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByPlaceholder("PT / Dinas / Umum...").fill(organization);
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByPlaceholder("Kepala Bidang / Staff...").fill("Staff QA");
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByPlaceholder("19700101... atau 7371...").fill(`7371${suffix}`);
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByRole("button", { name: /Diskominfo Makassar/i }).click();

  await page.getByPlaceholder("Makassar, Gowa...").fill("Makassar");
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByRole("button", { name: "Sulawesi Selatan" }).click();

  await page.getByPlaceholder("Koordinasi / Konsultasi...").fill(`Koordinasi QA ${suffix}`);
  await page.getByPlaceholder("123/DK/2026").fill(`QA/${suffix}/2026`);
  await page.getByRole("button", { name: "Simpan Data" }).click();

  await expect(page.getByText(visitorName)).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAsAdmin(adminPage);

  await adminPage.goto("/admin/visitors");
  await adminPage.getByPlaceholder("Cari nama, instansi, atau NIP/NIK...").fill(visitorName);
  await expect(adminPage.getByRole("cell", { name: visitorName })).toBeVisible();

  await adminPage.goto("/admin/intake");
  await dismissVisibleToasts(adminPage);
  await adminPage.getByRole("button", { name: "Refresh" }).click();
  await expect(adminPage.getByText(/Antrian Baru/)).toBeVisible();
  await expect(adminPage.getByText(/^visitor$/).first()).toBeVisible();

  await adminContext.close();
});
