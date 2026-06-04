import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsOperator, loginAsReceptionist, randomDigits, randomSuffix } from "./helpers";

async function submitGuestVisit(page: import("@playwright/test").Page, overrides?: { unitLabel?: string; purpose?: string; visitorName?: string }) {
  const suffix = randomSuffix();
  const digitSuffix = randomDigits(8);
  const visitorName = overrides?.visitorName || `Visit QA ${suffix}`;
  const purpose = overrides?.purpose || `Kebutuhan QA ${suffix}`;
  const unitLabel = overrides?.unitLabel || "Bidang APTIKA";

  await page.goto("/guest");
  await page.getByPlaceholder("Nama Lengkap...").fill(visitorName);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("PT / Dinas / Umum...").fill(`PT QA ${suffix}`);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("Kepala Bidang / Staff...").fill("Staff QA");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByPlaceholder("19700101... atau 7371...").fill(digitSuffix);
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(page.getByRole("button", { name: "UPT Warroom" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: unitLabel }).click();
  await page.getByPlaceholder("Makassar, Gowa...").fill("Makassar");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: "Sulawesi Selatan" }).click();
  await page.getByPlaceholder("Koordinasi / Konsultasi...").fill(purpose);
  await page.getByPlaceholder("123/DK/2026").fill(`VT/${suffix}/2026`);
  await page.getByRole("button", { name: "Simpan Data" }).click();
  await expect(page.getByRole("button", { name: "Lacak Kunjungan" })).toBeVisible({ timeout: 30000 });
  const trackingId = ((await page.locator(".font-mono").last().textContent()) || "").trim();
  expect(trackingId).toMatch(/^VIS-/);
  return { trackingId, visitorName, purpose, unitLabel };
}

test("guest visit can be tracked after submission", async ({ page }) => {
  const visit = await submitGuestVisit(page, { unitLabel: "Sekretariat Diskominfo" });

  await page.getByRole("button", { name: "Lacak Kunjungan" }).click();
  await expect(page).toHaveURL(new RegExp(`/guest/tracking\\?id=${visit.trackingId}`));
  await expect(page.getByText(visit.trackingId)).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Terkirim" }).first()).toBeVisible();
});

test("receptionist can directly accept a visit", async ({ browser, page }) => {
  const visit = await submitGuestVisit(page, { unitLabel: "Sekretariat Diskominfo" });

  const recepContext = await browser.newContext();
  const recepPage = await recepContext.newPage();
  await loginAsReceptionist(recepPage);
  await recepPage.goto("/admin/intake");
  await recepPage.getByText(visit.visitorName).waitFor({ timeout: 30000 });
  await recepPage.getByRole("link", { name: /Buka/ }).first().click();
  await recepPage.getByPlaceholder("Tambah catatan...").fill("Resepsionis menerima langsung");
  await recepPage.getByRole("button", { name: "Terima Langsung" }).click();
  await expect(recepPage.getByText(/Diterima Bidang|accepted_by_unit/i)).toBeVisible();
  await recepContext.close();

  await page.goto(`/guest/tracking?id=${visit.trackingId}`);
  await expect(page.getByText("Diterima Bidang")).toBeVisible();
});

test("receptionist can forward a visit and operator can accept it", async ({ browser, page }) => {
  const visit = await submitGuestVisit(page, { unitLabel: "Bidang APTIKA" });

  const recepContext = await browser.newContext();
  const recepPage = await recepContext.newPage();
  await loginAsReceptionist(recepPage);
  await recepPage.goto("/admin/intake");
  await recepPage.getByText(visit.visitorName).waitFor({ timeout: 30000 });
  await recepPage.getByRole("link", { name: /Buka/ }).first().click();
  await recepPage.getByRole("combobox").nth(0).selectOption({ label: "Bidang APTIKA" });
  await recepPage.getByRole("combobox").nth(1).selectOption({ label: "Operator Bidang APTIKA" });
  await recepPage.getByRole("button", { name: /Assign Operator/i }).click();
  await expect(recepPage.getByText(/Diteruskan ke: Bidang APTIKA/i)).toBeVisible();
  await recepContext.close();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await loginAsOperator(operatorPage);
  await operatorPage.goto("/admin/inbox");
  await dismissVisibleToasts(operatorPage);
  await expect(operatorPage.getByText(visit.visitorName)).toBeVisible({ timeout: 20000 });
  await operatorPage.getByRole("link", { name: /Buka|Detail/i }).first().click();
  await operatorPage.getByPlaceholder("Tambah catatan...").fill("Bidang menerima kunjungan");
  await operatorPage.getByRole("button", { name: "Bidang Terima Kunjungan" }).click();
  await expect(operatorPage.getByText(/Diterima Bidang|accepted_by_unit/i)).toBeVisible();
  await operatorContext.close();

  await page.goto(`/guest/tracking?id=${visit.trackingId}`);
  await expect(page.getByText("Diterima Bidang")).toBeVisible();
  await expect(page.getByText(/Bidang APTIKA/)).toBeVisible();
});

test("receptionist can forward a visit and operator can reject it", async ({ browser, page }) => {
  const visit = await submitGuestVisit(page, { unitLabel: "UPT Warroom", purpose: "Permintaan akses yang akan ditolak" });

  const recepContext = await browser.newContext();
  const recepPage = await recepContext.newPage();
  await loginAsReceptionist(recepPage);
  await recepPage.goto("/admin/intake");
  await recepPage.getByText(visit.visitorName).waitFor({ timeout: 30000 });
  await recepPage.getByRole("link", { name: /Buka/ }).first().click();
  await recepPage.getByRole("combobox").nth(0).selectOption({ label: "UPT Warroom" });
  await recepPage.getByRole("combobox").nth(1).selectOption({ label: "Operator UPT Warroom" });
  await recepPage.getByRole("button", { name: /Assign Operator/i }).click();
  await recepContext.close();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await loginAsOperator(operatorPage);
  await operatorPage.goto("/admin/inbox");
  await dismissVisibleToasts(operatorPage);
  await expect(operatorPage.getByText(visit.visitorName)).toBeVisible({ timeout: 20000 });
  await operatorPage.getByRole("link", { name: /Buka|Detail/i }).first().click();
  await operatorPage.getByPlaceholder("Tambah catatan...").fill("Bidang menolak kunjungan ini");
  await operatorPage.getByRole("button", { name: "Bidang Tolak Kunjungan" }).click();
  await expect(operatorPage.getByText(/Ditolak Bidang|rejected_by_unit/i)).toBeVisible();
  await operatorContext.close();

  await page.goto(`/guest/tracking?id=${visit.trackingId}`);
  await expect(page.getByText("Ditolak Bidang")).toBeVisible();
  await expect(page.getByText(/Bidang menolak kunjungan ini/)).toBeVisible();
});
