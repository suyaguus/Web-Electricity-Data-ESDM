// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// 🔥 PERUBAHAN: Menambahkan TableFooter
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type TemplateList = { kodeLaporan: string; namaLaporan: string };
type DataRow = Record<string, unknown>;
type KolomDef = { key: string; label: string; tipe: string; wajib: boolean };

export default function DashboardPage() {
  const [daftarTemplate, setDaftarTemplate] = useState<TemplateList[]>([]);
  const [kodeLaporan, setKodeLaporan] = useState("");
  const [tahunPilih, setTahunPilih] = useState("Semua");
  const [opsiTahun, setOpsiTahun] = useState<string[]>([]);
  const [dataLaporan, setDataLaporan] = useState<DataRow[]>([]);
  const [urutanKolom, setUrutanKolom] = useState<KolomDef[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setDaftarTemplate(data);
        }
      } catch (error) {
        console.error("Gagal memuat template:", error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!kodeLaporan) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/data-laporan?kode=${kodeLaporan}&tahun=${tahunPilih}`,
        );
        if (res.ok) {
          const result = await res.json();
          setDataLaporan(result.data || []);

          if (result.definisiKolom) {
            setUrutanKolom(result.definisiKolom);
          }
          if (tahunPilih === "Semua") {
            setOpsiTahun(result.listTahun || []);
          }
        } else {
          setDataLaporan([]);
        }
      } catch (error) {
        console.error("Gagal memuat data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [kodeLaporan, tahunPilih]);

  const formatDataLayar = (nilai: unknown, namaKolom: string) => {
    if (nilai === null || nilai === undefined || nilai === "") return "-";
    const teksKolom = namaKolom.toLowerCase();
    if (
      teksKolom.includes("bulan") ||
      teksKolom.includes("jenis") ||
      teksKolom.includes("tahun") ||
      teksKolom.includes("nama") ||
      teksKolom.includes("npm")
    ) {
      return String(nilai);
    }
    const num = Number(nilai);
    if (!isNaN(num)) {
      return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 5,
      }).format(num);
    }
    return String(nilai);
  };

  // 🔥 FUNGSI BARU: Menghitung total tiap kolom secara otomatis
  // 🔥 FUNGSI BARU: Menghitung total tiap kolom secara otomatis
  const hitungTotalKolom = (kolom: KolomDef) => {
    // 1. Jika bukan angka, jangan dijumlahkan
    if (kolom.tipe !== "number") return "-";

    // 2. HAPUS: Baris `if (kolom.label.includes("%")) return "-";` telah dibuang agar % tetap dijumlahkan.

    // 3. Kalkulasi total matematika
    const total = dataLaporan.reduce((acc, row) => {
      const num = Number(row[kolom.key]);
      return !isNaN(num) ? acc + num : acc;
    }, 0);

    // 4. Format hasilnya dengan titik dan koma yang rapi
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 5 }).format(
      total,
    );
  };

  return (
    <div className="p-4 md:p-8 w-full xl:max-w-[95%] mx-auto min-h-screen flex flex-col gap-6 bg-gray-50/50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          📊 Dashboard Laporan
        </h1>
        <p className="text-muted-foreground">
          Lihat dan pantau semua data yang telah masuk ke sistem.
        </p>
      </div>

      <div className="bg-card text-card-foreground p-5 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Jenis Laporan:</label>
          <Select
            value={kodeLaporan}
            onValueChange={(val) => {
              setKodeLaporan(val);
              setTahunPilih("Semua");
            }}
          >
            <SelectTrigger className="font-medium text-gray-900 h-11">
              <SelectValue placeholder="-- Pilih Jenis Laporan --" />
            </SelectTrigger>
            <SelectContent>
              {daftarTemplate.map((tpl) => (
                <SelectItem key={tpl.kodeLaporan} value={tpl.kodeLaporan}>
                  {tpl.namaLaporan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-56 space-y-2">
          <label className="text-sm font-medium">Tahun / Periode:</label>
          <Select
            value={tahunPilih}
            onValueChange={setTahunPilih}
            disabled={!kodeLaporan}
          >
            <SelectTrigger className="font-medium text-gray-900 h-11">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Tahun</SelectItem>
              {opsiTahun.map((tahun) => (
                <SelectItem key={tahun} value={tahun}>
                  {tahun}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-xl shadow-sm border flex-grow flex flex-col min-h-[500px] overflow-hidden">
        {!kodeLaporan ? (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-6xl mb-4 opacity-40">📊</div>
            <p className="text-lg font-medium text-gray-500">
              Silakan pilih laporan di atas
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="animate-pulse font-medium">Memuat data...</span>
          </div>
        ) : dataLaporan.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-6xl mb-4 opacity-40">📂</div>
            <p className="text-lg font-medium text-gray-500">
              Belum ada data untuk laporan ini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/30">
              <h2 className="font-semibold text-lg text-gray-700">
                Total Data:{" "}
                <span className="text-primary font-bold">
                  {dataLaporan.length}
                </span>{" "}
                baris
              </h2>
              <Button variant="outline" size="sm" className="font-medium">
                ⬇ Export ke Excel
              </Button>
            </div>

            <div className="overflow-x-auto flex-grow">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="whitespace-nowrap w-[50px] font-semibold text-gray-700">
                      No
                    </TableHead>
                    {urutanKolom.map((kolom) => (
                      <TableHead
                        key={kolom.key}
                        className="whitespace-nowrap font-semibold text-gray-700"
                      >
                        {kolom.label}
                      </TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap text-right font-semibold text-gray-700 pr-6">
                      Tanggal Upload
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLaporan.map((row, index) => (
                    <TableRow
                      key={row.idDb as string}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-600 border-b whitespace-nowrap text-center">
                        {index + 1}
                      </td>
                      {urutanKolom.map((kolom) => (
                        <td
                          key={kolom.key}
                          className="px-4 py-3 border-b whitespace-nowrap text-gray-800"
                        >
                          {formatDataLayar(row[kolom.key], kolom.key)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-gray-400 text-xs text-right border-b whitespace-nowrap pr-6">
                        {new Date(
                          row.tanggalUpload as string,
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </TableRow>
                  ))}
                </TableBody>

                {/* 🔥 FITUR BARU: Tabel Footer Dinamis */}
                <TableFooter className="bg-blue-50/80 text-gray-900 border-t-2 border-blue-200">
                  <TableRow>
                    <TableCell className="text-center font-bold">-</TableCell>

                    {urutanKolom.map((kolom, index) => (
                      <TableCell
                        key={kolom.key}
                        className="whitespace-nowrap font-bold"
                      >
                        {index === 0
                          ? "TOTAL KESELURUHAN"
                          : hitungTotalKolom(kolom)}
                      </TableCell>
                    ))}

                    {/* Komentar dipindah ke DALAM tag agar tidak error! */}
                    <TableCell className="text-center">
                      {/* Kosong untuk kolom Tanggal */}-
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
