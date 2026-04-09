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

    // 🔥 PERBAIKAN: Beri tahu TypeScript bentuk asli dari data Excel ini menggunakan "as"
    const rawDataKotor = xlsx.utils.sheet_to_json(worksheet) as Record<
      string,
      unknown
    >[];

    // --- (Kode di bawahnya sekarang otomatis paham dan tidak akan error) ---
    // Hapus ': Record<string, unknown>' di dalam filter karena TypeScript sudah otomatis tahu dari atasnya
    const rawData = rawDataKotor.filter((row) => {
      const isTotalRow = Object.values(row).some((val) => {
        // Cek apakah ada sel yang isinya "total" (baik huruf besar/kecil)
        return String(val).toLowerCase().trim() === "total";
      });

      // Jika baris tersebut BUKAN total, kembalikan true (simpan datanya)
      return !isTotalRow;
    });

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

          // ... kode di atasnya tetap ...
          if (
            kolom.wajib &&
            (value === undefined || value === null || value === "")
          ) {
            hasError = true;
            errors[kolom.key] = `${kolom.label} wajib diisi!`;
          }

          if (value !== undefined && value !== null && value !== "") {
            if (kolom.tipe === "number") {
              // 🔥 TRIK BARU: Bersihkan string dari simbol aneh sebelum dicek
              // 1. Ubah ke string
              // 2. Hapus semua spasi
              // 3. Hapus simbol %
              // 4. Ubah koma (,) khas Indonesia menjadi titik (.) standar komputer
              const teksBersih = String(value)
                .trim()
                .replace(/%/g, "")
                .replace(/,/g, ".");
              const angkaHasil = Number(teksBersih);

              if (isNaN(angkaHasil)) {
                hasError = true;
                errors[kolom.key] = `${kolom.label} harus berupa angka!`;
                cleanData[kolom.key] = String(value); // Biarkan error agar admin lihat di layar
              } else {
                cleanData[kolom.key] = angkaHasil; // Simpan angka bersihnya
              }
            } else {
              // Jika tipe datanya 'string', biarkan apa adanya
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
