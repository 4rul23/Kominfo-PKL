import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, loginAsOperator, loginAsReceptionist, tinyPngBuffer } from "./helpers";

test("real surat flow works across receptionist -> operator -> admin", async ({ browser, page }) => {
  test.setTimeout(180000);

  await page.goto("/surat");
  await page.getByPlaceholder("Nama Lengkap").fill("QA Role Surat Real");
  await page.getByPlaceholder("Email").fill("qa-role-real@example.com");
  await page.getByPlaceholder("No. Telepon").fill("081234567890");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.getByPlaceholder("PT / Dinas / Organisasi").fill("PT QA Role Real");
  await page.getByPlaceholder("Alamat lengkap (opsional)").fill("Makassar");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.getByRole("button", { name: /Permohonan/i }).first().click();
  await page.getByPlaceholder("Perihal surat Anda...").fill("Pengujian Surat Role Real");
  await page.getByPlaceholder("Tuliskan isi surat atau pesan Anda di sini...").fill("Surat ini dipakai untuk pengujian real role workflow.");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "lampiran-role-real.png",
    mimeType: "image/png",
    buffer: tinyPngBuffer(),
  });
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  const saveResponsePromise = page.waitForResponse((response) => response.url().includes("/api/surat") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Kirim Surat" }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();
  await expect(page.getByText("Surat Terkirim!")).toBeVisible();
  const trackingId = ((await page.locator("p.font-mono").first().textContent()) || "").trim();
  expect(trackingId).toMatch(/^TRK-/);

  const recepContext = await browser.newContext();
  const recepPage = await recepContext.newPage();
  await loginAsReceptionist(recepPage);
  await recepPage.goto("/admin/surat");
  await dismissVisibleToasts(recepPage);
  await recepPage.waitForFunction(async (value) => {
    const response = await fetch('/api/surat', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data.surat) && data.surat.some((item: { trackingId?: string }) => item.trackingId === value);
  }, trackingId, { timeout: 30000 });
  await recepPage.reload();
  await recepPage.getByPlaceholder("Cari tracking ID, pengirim, atau perihal...").fill(trackingId);
  const recepRow = recepPage.locator("tr").filter({ hasText: trackingId });
  await expect(recepRow).toBeVisible({ timeout: 30000 });
  await recepRow.locator("button").first().click();
  await expect(recepPage.getByRole("button", { name: /^Verifikasi$/ })).toBeEnabled();
  await recepPage.getByRole("button", { name: /^Verifikasi$/ }).click();
  await recepPage.waitForFunction(async (value) => {
    const response = await fetch('/api/surat', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data.surat) && data.surat.some((item: { trackingId?: string; status?: string }) => item.trackingId === value && item.status === 'verified');
  }, trackingId, { timeout: 30000 });
  await expect(recepPage.locator("span").filter({ hasText: "Terverifikasi" }).first()).toBeVisible();
  await recepContext.close();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await loginAsOperator(operatorPage);
  await operatorPage.goto("/admin/surat");
  await dismissVisibleToasts(operatorPage);
  await operatorPage.waitForFunction(async (value) => {
    const response = await fetch('/api/surat', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data.surat) && data.surat.some((item: { trackingId?: string }) => item.trackingId === value);
  }, trackingId, { timeout: 30000 });
  await operatorPage.reload();
  await operatorPage.getByPlaceholder("Cari tracking ID, pengirim, atau perihal...").fill(trackingId);
  const operatorRow = operatorPage.locator("tr").filter({ hasText: trackingId });
  await expect(operatorRow).toBeVisible({ timeout: 30000 });
  await operatorRow.locator("button").first().click();
  await expect(operatorPage.getByRole("heading", { name: "Detail Surat" })).toBeVisible();
  await dismissVisibleToasts(operatorPage);
  const processButton = operatorPage.getByRole("button", { name: /Diproses/i }).first();
  await expect(processButton).toBeVisible({ timeout: 20000 });
  await expect(processButton).toBeEnabled({ timeout: 20000 });
  await processButton.click({ force: true });
  await operatorPage.waitForFunction(async (value) => {
    const response = await fetch('/api/surat', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data.surat) && data.surat.some((item: { trackingId?: string; status?: string }) => item.trackingId === value && item.status === 'in_review');
  }, trackingId, { timeout: 30000 });
  await expect(operatorPage.locator("span").filter({ hasText: "Diproses" }).first()).toBeVisible();
  await operatorContext.close();

  await loginAsAdmin(page);
  await page.goto("/admin/surat");
  await dismissVisibleToasts(page);
  await page.waitForFunction(async (value) => {
    const response = await fetch('/api/surat', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data.surat) && data.surat.some((item: { trackingId?: string }) => item.trackingId === value);
  }, trackingId, { timeout: 30000 });
  await page.reload();
  await page.getByPlaceholder("Cari tracking ID, pengirim, atau perihal...").fill(trackingId);
  const adminRow = page.locator("tr").filter({ hasText: trackingId });
  await expect(adminRow).toBeVisible({ timeout: 30000 });
  await adminRow.locator("button").first().click();
  await expect(page.getByRole("heading", { name: "Detail Surat" })).toBeVisible();
  await dismissVisibleToasts(page);
  const parafButton = page.getByRole("button", { name: /Paraf/i }).first();
  await expect(parafButton).toBeVisible({ timeout: 20000 });
  await expect(parafButton).toBeEnabled({ timeout: 20000 });
  await parafButton.click({ force: true });
  const approveButton = page.getByRole("button", { name: /Disetujui/i }).first();
  await expect(approveButton).toBeVisible({ timeout: 20000 });
  await expect(approveButton).toBeEnabled({ timeout: 20000 });
  await approveButton.click({ force: true });
  const archiveButton = page.getByRole("button", { name: /Arsip/i }).first();
  await expect(archiveButton).toBeVisible({ timeout: 20000 });
  await expect(archiveButton).toBeEnabled({ timeout: 20000 });
  await archiveButton.click({ force: true });
  await expect(page.locator("span").filter({ hasText: "Arsip" }).first()).toBeVisible();
});
