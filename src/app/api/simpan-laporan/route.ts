// src/app/api/simpan-laporan/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Tipe data ini memuaskan ESLint (karena jelas) DAN Prisma (karena ini valid JSON)
type ExcelRow = Record<string, string | number | null>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kodeLaporan, dataBaris, tahun } = body;

    // 1. Validasi Input Dasar
    if (
      !kodeLaporan ||
      !dataBaris ||
      !Array.isArray(dataBaris) ||
      dataBaris.length === 0
    ) {
      return NextResponse.json(
        { error: "Data tidak valid atau kosong" },
        { status: 400 },
      );
    }

    // 2. Cari Template ID berdasarkan kode laporan
    const template = await prisma.templateLaporan.findUnique({
      where: { kodeLaporan: kodeLaporan },
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template Laporan tidak ditemukan di database" },
        { status: 404 },
      );
    }

    // 3. Format Data untuk Bulk Insert Prisma
    // Menggunakan tipe 'ExcelRow' agar TypeScript dan Prisma berhenti protes
    const dataUntukDisimpan = dataBaris.map((baris: ExcelRow) => {
      // Prioritas:
      // 1. Tahun dari input form manual
      // 2. Tahun yang mungkin ada di dalam kolom excel (baris['tahun'])
      // 3. Tahun saat ini (fallback)
      const periodeFinal =
        tahun || baris["tahun"] || baris["Tahun"] || new Date().getFullYear();

      return {
        templateId: template.id,
        isiData: baris, // Sekarang Prisma yakin 100% ini adalah JSON yang aman
        periode: String(periodeFinal),
      };
    });

    // 4. Eksekusi Simpan ke Database (Bulk Insert)
    const hasil = await prisma.dataLaporan.createMany({
      data: dataUntukDisimpan,
    });

    return NextResponse.json(
      {
        pesan: "Data berhasil disimpan!",
        jumlahDisimpan: hasil.count,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error menyimpan laporan:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data ke database server." },
      { status: 500 },
    );
  }
}
