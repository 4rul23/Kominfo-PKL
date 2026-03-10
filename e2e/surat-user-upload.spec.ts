import { expect, test } from "@playwright/test";

import { tinyPngBuffer } from "./helpers";

test("public user can upload surat with attachment and get tracking", async ({ page }) => {
  await page.goto("/surat");

  await page.getByPlaceholder("Nama Lengkap").fill("PT Contoh Nusantara");
  await page.getByPlaceholder("Email").fill("qa.surat@example.com");
  await page.getByPlaceholder("No. Telepon").fill("081234567890");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.getByPlaceholder("PT / Dinas / Organisasi").fill("PT Contoh Nusantara");
  await page.getByPlaceholder("Alamat lengkap (opsional)").fill("Jl. Pengujian Nomor 1, Makassar");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.getByRole("button", { name: /Permohonan/i }).first().click();

  await page.getByPlaceholder("Perihal surat Anda...").fill("Permohonan Data Integrasi E2E");
  await page.getByPlaceholder("Tuliskan isi surat atau pesan Anda di sini...").fill("Mohon diproses untuk kebutuhan pengujian end-to-end.");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "lampiran-uji.png",
    mimeType: "image/png",
    buffer: tinyPngBuffer(),
  });
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  const saveResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/surat") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Kirim Surat" }).click();
  const saveResponse = await saveResponsePromise;
  const saveText = await saveResponse.text();
  expect(saveResponse.ok(), `POST /api/surat failed: ${saveResponse.status()} ${saveText}`).toBeTruthy();

  await expect(page.getByText("Surat Terkirim!")).toBeVisible();
  const trackingIdText = (await page.locator("p.font-mono").first().textContent())?.trim() || "";
  expect(trackingIdText).toMatch(/^TRK-\d{4}-\d{2}-[A-Z0-9]{4,8}$/);

  await page.getByRole("button", { name: "Lacak Surat" }).click();
  await expect(page).toHaveURL(/\/surat\/tracking/);
  await expect.poll(() => new URL(page.url()).searchParams.get("id")).toBe(trackingIdText);
  await expect(page.getByText(trackingIdText)).toBeVisible();
});
