import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaLaporan, kodeLaporan, deskripsi, definisiKolom } = body;

    // Validasi input dasar
    if (!namaLaporan || !kodeLaporan || !definisiKolom) {
      return NextResponse.json(
        { error: "Data template tidak lengkap" },
        { status: 400 },
      );
    }

    // Cek apakah kode sudah dipakai
    const existing = await prisma.templateLaporan.findUnique({
      where: { kodeLaporan },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kode laporan sudah digunakan!" },
        { status: 400 },
      );
    }

    // Simpan template baru ke Database
    const newTemplate = await prisma.templateLaporan.create({
      data: {
        namaLaporan,
        kodeLaporan,
        deskripsi,
        definisiKolom, // Disimpan otomatis sebagai JSONB
      },
    });

    return NextResponse.json(
      {
        pesan: "Template berhasil dibuat!",
        data: newTemplate,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error create template:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan template" },
      { status: 500 },
    );
  }
}

// Tambahkan di bagian paling bawah src/app/api/templates/route.ts

export async function GET() {
  try {
    // Ambil semua template dari database, urutkan dari yang terbaru
    const templates = await prisma.templateLaporan.findMany({
      select: {
        kodeLaporan: true,
        namaLaporan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar template" },
      { status: 500 },
    );
  }
}
