// src/app/api/upload-preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const kodeLaporan = formData.get("kodeLaporan") as string;

    if (!file || !kodeLaporan) {
      return NextResponse.json(
        { error: "File dan kodeLaporan wajib dikirim" },
        { status: 400 },
      );
    }

    const template = await prisma.templateLaporan.findUnique({
      where: { kodeLaporan: kodeLaporan },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template Laporan tidak ditemukan" },
        { status: 404 },
      );
    }

    const definisiKolom = template.definisiKolom as Array<{
      key: string;
      label: string;
      tipe: string;
      wajib: boolean;
    }>;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // --- (Kode di atasnya tetap sama, mulai dari sini ke bawah diubah) ---
    const rawData =
      xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "File Excel kosong atau format tidak terbaca!" },
        { status: 400 },
      );
    }

    // 🔥 FITUR BARU: FUNGSI NORMALISASI
    // Mengubah "Rumah Tangga", "Rumah_Tangga", "RUMAH TANGGA" -> "rumahtangga"
    const normalizeStr = (str: string) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

    // Buat Peta/Kamus Header Excel
    const rawExcelHeaders = Object.keys(rawData[0]);
    const headerMap: Record<string, string> = {};

    // Simpan ke kamus: { 'rumahtangga': 'Rumah Tangga (teks asli di excel)' }
    rawExcelHeaders.forEach((header) => {
      headerMap[normalizeStr(header)] = header;
    });

    // 1. Validasi Header (Kebal Spasi & Huruf Besar/Kecil)
    const missingColumns = definisiKolom
      .filter((kolom) => {
        if (!kolom.wajib) return false;
        const keyNormal = normalizeStr(kolom.key);
        // Jika key normal tidak ada di kamus, berarti kolom benar-benar hilang
        return !headerMap[keyNormal];
      })
      .map((kolom) => `"${kolom.label}"`);

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Format Excel tidak sesuai.\n\nKolom yang hilang: ${missingColumns.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // 2. Looping dan Validasi Data
    const previewData = rawData.map(
      (row: Record<string, unknown>, index: number) => {
        let hasError = false;
        const errors: Record<string, string> = {};
        const cleanData: Record<string, string | number> = {};

        definisiKolom.forEach((kolom) => {
          const keyNormal = normalizeStr(kolom.key);
          const headerAsli = headerMap[keyNormal]; // Ambil nama header aslinya

          // Ambil nilai menggunakan header aslinya (jika kolomnya ada)
          const value = headerAsli ? row[headerAsli] : undefined;

          if (
            kolom.wajib &&
            (value === undefined || value === null || value === "")
          ) {
            hasError = true;
            errors[kolom.key] = `${kolom.label} wajib diisi!`;
          }

          if (value !== undefined && value !== null && value !== "") {
            if (kolom.tipe === "number" && isNaN(Number(value))) {
              hasError = true;
              errors[kolom.key] = `${kolom.label} harus berupa angka!`;
              cleanData[kolom.key] = String(value);
            } else if (kolom.tipe === "number") {
              cleanData[kolom.key] = Number(value);
            } else {
              cleanData[kolom.key] = String(value);
            }
          }
        });

        return {
          id: index,
          data: cleanData,
          hasError,
          errors,
        };
      },
    );

    return NextResponse.json(
      {
        pesan: "Berhasil diparse",
        templateNama: template.namaLaporan,
        previewData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return NextResponse.json(
      { error: "Gagal memproses file Excel. Pastikan format valid." },
      { status: 500 },
    );
  }
}
