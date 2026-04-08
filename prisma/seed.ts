// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Pastikan DATABASE_URL terbaca
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL tidak ditemukan di environment variables");
}

// Setup Adapter (Wajib di Prisma v7)
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Mulai melakukan seeding database...");

  const templateKonsumsi = await prisma.templateLaporan.upsert({
    where: { kodeLaporan: "KONSUMSI_PERKAPITA" },
    update: {},
    create: {
      namaLaporan: "Konsumsi Listrik Perkapita",
      kodeLaporan: "KONSUMSI_PERKAPITA",
      deskripsi: "Laporan tahunan konsumsi listrik per kapita untuk 3 tahun",
      definisiKolom: [
        { key: "tahun", label: "Tahun", tipe: "number", wajib: true },
        {
          key: "penduduk",
          label: "Jumlah Penduduk",
          tipe: "number",
          wajib: true,
        },
        { key: "kwh_jual", label: "KWH Jual", tipe: "number", wajib: true },
      ],
    },
  });

  console.log(
    "Template Laporan berhasil dibuat:",
    templateKonsumsi.namaLaporan,
  );
  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // Tutup pool koneksi pg agar script bisa berhenti dengan sempurna
    await pool.end();
  });
