// src/app/api/data-laporan/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kodeLaporan = searchParams.get("kode");
    const tahunFilter = searchParams.get("tahun"); // Parameter baru

    if (!kodeLaporan) {
      return NextResponse.json(
        { error: "Kode laporan wajib disertakan" },
        { status: 400 },
      );
    }

    // Siapkan kondisi query (Where Clause)
    type KondisiQuery = {
      template: { kodeLaporan: string };
      periode?: string; // Tanda "?" berarti properti ini opsional (boleh ada, boleh tidak)
    };

    const kondisi: KondisiQuery = {
      template: { kodeLaporan: kodeLaporan },
    };

    // Jika admin memilih tahun di frontend, tambahkan ke kondisi query
    if (tahunFilter && tahunFilter !== "Semua") {
      kondisi.periode = tahunFilter;
    }

    // Panggil data dari database
    const dataLaporan = await prisma.dataLaporan.findMany({
      where: kondisi,
      orderBy: { createdAt: "desc" },
    });

    const dataBersih = dataLaporan.map((item) => ({
      idDb: item.id,
      tanggalUpload: item.createdAt,
      ...(item.isiData as object),
    }));

    // Bonus: Ambil daftar tahun unik yang tersedia untuk laporan ini agar dropdown UI dinamis
    const tahunTersedia = await prisma.dataLaporan.findMany({
      where: { template: { kodeLaporan: kodeLaporan } },
      select: { periode: true },
      distinct: ["periode"],
    });

    const listTahun = tahunTersedia
      .map((t) => t.periode)
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a)); // Urutkan dari tahun terbaru

    return NextResponse.json(
      {
        data: dataBersih,
        listTahun: listTahun,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data laporan" },
      { status: 500 },
    );
  }
}
