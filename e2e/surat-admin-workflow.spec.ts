import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, tinyPngBuffer } from "./helpers";

test("admin can process surat through strict status sequence", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/surat");
  await page.getByPlaceholder("Nama Lengkap").fill("QA Admin Surat");
  await page.getByPlaceholder("Email").fill("qa-admin-surat@example.com");
  await page.getByPlaceholder("No. Telepon").fill("081234567890");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByPlaceholder("PT / Dinas / Organisasi").fill("PT QA Admin");
  await page.getByPlaceholder("Alamat lengkap (opsional)").fill("Makassar");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByRole("button", { name: /Permohonan/i }).first().click();
  await page.getByPlaceholder("Perihal surat Anda...").fill("Pengujian Alur Admin Surat");
  await page.getByPlaceholder("Tuliskan isi surat atau pesan Anda di sini...").fill("Surat ini dipakai untuk pengujian admin surat end-to-end.");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "lampiran-admin-flow.png",
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

  await loginAsAdmin(page);
  await page.goto("/admin/surat");
  await dismissVisibleToasts(page);
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.getByPlaceholder("Cari tracking ID, pengirim, atau perihal...").fill(trackingId);

  const targetRow = page.locator("tr").filter({ hasText: trackingId });
  await expect(targetRow).toBeVisible({ timeout: 20000 });
  await targetRow.locator("button").first().click();

  await expect(page.getByRole("heading", { name: "Detail Surat" })).toBeVisible();
  await page.getByRole("button", { name: /^Verifikasi$/ }).click();
  await expect(page.getByRole("button", { name: /Update ke Diproses/i })).toBeVisible();
  await page.getByRole("button", { name: /Update ke Diproses/i }).click();
  await expect(page.getByRole("button", { name: /Update ke Paraf/i })).toBeVisible();
  await page.getByRole("button", { name: /Update ke Paraf/i }).click();
  await expect(page.getByRole("button", { name: /Update ke Disetujui/i })).toBeVisible();
  await page.getByRole("button", { name: /Update ke Disetujui/i }).click();
  await expect(page.getByRole("button", { name: /Update ke Arsip/i })).toBeVisible();
  await page.getByRole("button", { name: /Update ke Arsip/i }).click();
  await expect(page.locator("span").filter({ hasText: "Arsip" }).first()).toBeVisible();
});
