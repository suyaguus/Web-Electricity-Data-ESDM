// src/app/api/data-laporan/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type KondisiQuery = {
  template: { kodeLaporan: string };
  periode?: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kodeLaporan = searchParams.get("kode");
    const tahunFilter = searchParams.get("tahun");

    if (!kodeLaporan) {
      return NextResponse.json(
        { error: "Kode laporan wajib disertakan" },
        { status: 400 },
      );
    }

    // 1. Ambil Definisi Kolom ASLI dari template (untuk mempertahankan urutan)
    const templateInfo = await prisma.templateLaporan.findUnique({
      where: { kodeLaporan: kodeLaporan },
      select: { definisiKolom: true },
    });

    const kondisi: KondisiQuery = {
      template: { kodeLaporan: kodeLaporan },
    };

    if (tahunFilter && tahunFilter !== "Semua") {
      kondisi.periode = tahunFilter;
    }

    // 2. Ambil isi data
    const dataLaporan = await prisma.dataLaporan.findMany({
      where: kondisi,
      orderBy: { createdAt: "desc" },
    });

    const dataBersih = dataLaporan.map((item) => ({
      idDb: item.id,
      tanggalUpload: item.createdAt,
      ...(item.isiData as object),
    }));

    const tahunTersedia = await prisma.dataLaporan.findMany({
      where: { template: { kodeLaporan: kodeLaporan } },
      select: { periode: true },
      distinct: ["periode"],
    });

    const listTahun = tahunTersedia
      .map((t) => t.periode)
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a));

    return NextResponse.json(
      {
        data: dataBersih,
        listTahun: listTahun,
        // 🔥 Kirimkan urutan kolom aslinya ke Frontend!
        definisiKolom: templateInfo?.definisiKolom || [],
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
