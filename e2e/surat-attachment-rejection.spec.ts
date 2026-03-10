import { expect, test } from "@playwright/test";

test("surat rejects dangerous attachment extension in UI", async ({ page }) => {
  await page.goto("/surat");

  await page.getByPlaceholder("Nama Lengkap").fill("QA Reject Attachment");
  await page.getByPlaceholder("Email").fill("reject@example.com");
  await page.getByPlaceholder("No. Telepon").fill("081234567890");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByPlaceholder("PT / Dinas / Organisasi").fill("PT Reject Test");
  await page.getByPlaceholder("Alamat lengkap (opsional)").fill("Makassar");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByRole("button", { name: /Permohonan/i }).first().click();
  await page.getByPlaceholder("Perihal surat Anda...").fill("Reject attachment test");
  await page.getByPlaceholder("Tuliskan isi surat atau pesan Anda di sini...").fill("Testing invalid attachment rejection.");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "bad-script.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ-fake"),
  });

  await expect(page.getByText(/Ekstensi berbahaya ditolak|Format .* tidak didukung/i)).toBeVisible();
});

test("surat rejects oversized attachment in UI", async ({ page }) => {
  await page.goto("/surat");

  await page.getByPlaceholder("Nama Lengkap").fill("QA Oversize Attachment");
  await page.getByPlaceholder("Email").fill("oversize@example.com");
  await page.getByPlaceholder("No. Telepon").fill("081234567890");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByPlaceholder("PT / Dinas / Organisasi").fill("PT Oversize Test");
  await page.getByPlaceholder("Alamat lengkap (opsional)").fill("Makassar");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();
  await page.getByRole("button", { name: /Permohonan/i }).first().click();
  await page.getByPlaceholder("Perihal surat Anda...").fill("Oversized attachment test");
  await page.getByPlaceholder("Tuliskan isi surat atau pesan Anda di sini...").fill("Testing oversized attachment rejection.");
  await page.getByRole("button", { name: /^Lanjut$/ }).click();

  const bigBuffer = Buffer.alloc(4 * 1024 * 1024 + 128, 1);
  await page.locator('input[type="file"]').setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: bigBuffer,
  });

  await expect(page.getByText(/terlalu besar/i)).toBeVisible();
});
