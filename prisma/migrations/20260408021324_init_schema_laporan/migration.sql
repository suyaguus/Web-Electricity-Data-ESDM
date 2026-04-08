-- CreateTable
CREATE TABLE "TemplateLaporan" (
    "id" TEXT NOT NULL,
    "namaLaporan" TEXT NOT NULL,
    "kodeLaporan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "definisiKolom" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateLaporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataLaporan" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isiData" JSONB NOT NULL,
    "periode" TEXT,
    "kodeWilayah" TEXT,
    "diunggahOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataLaporan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateLaporan_kodeLaporan_key" ON "TemplateLaporan"("kodeLaporan");

-- CreateIndex
CREATE INDEX "DataLaporan_templateId_idx" ON "DataLaporan"("templateId");

-- CreateIndex
CREATE INDEX "DataLaporan_periode_idx" ON "DataLaporan"("periode");

-- CreateIndex
CREATE INDEX "DataLaporan_kodeWilayah_idx" ON "DataLaporan"("kodeWilayah");

-- AddForeignKey
ALTER TABLE "DataLaporan" ADD CONSTRAINT "DataLaporan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLaporan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
