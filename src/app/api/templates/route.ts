// src/app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. Frontend hanya mengirimkan 3 data ini sekarang (tanpa kodeLaporan)
    const { namaLaporan, deskripsi, definisiKolom } = body;

    // 2. Validasi: Kita TIDAK LAGI menuntut kodeLaporan di sini
    if (!namaLaporan || !definisiKolom) {
      return NextResponse.json(
        {
          error: "Data template tidak lengkap. Pastikan Nama dan Kolom terisi.",
        },
        { status: 400 },
      );
    }

    // 3. GENERASI KODE OTOMATIS (SLUG)
    // Mengubah "nama npm" menjadi "NAMA_NPM"
    let kodeOtomatis = namaLaporan
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "_"); // Ganti spasi & simbol menjadi underscore

    // 4. Cek apakah kode tersebut sudah dipakai laporan lain di database
    const existing = await prisma.templateLaporan.findUnique({
      where: { kodeLaporan: kodeOtomatis },
    });

    // Jika sudah ada yang pakai, tambahkan 4 angka acak di belakangnya agar unik
    if (existing) {
      kodeOtomatis = `${kodeOtomatis}_${Date.now().toString().slice(-4)}`;
    }

    // 5. Simpan ke database
    const newTemplate = await prisma.templateLaporan.create({
      data: {
        namaLaporan,
        kodeLaporan: kodeOtomatis, // Masukkan kode otomatis ke database
        deskripsi: deskripsi || "",
        definisiKolom,
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
      { error: "Gagal menyimpan template ke database." },
      { status: 500 },
    );
  }
}

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
