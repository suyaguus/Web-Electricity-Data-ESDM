// src/app/upload/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type PreviewRow = {
  id: number;
  data: Record<string, string | number>;
  hasError: boolean;
  errors: Record<string, string>;
};

type KolomDef = { key: string; label: string; tipe: string; wajib: boolean };
type TemplateList = { kodeLaporan: string; namaLaporan: string };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [kodeLaporan, setKodeLaporan] = useState("");
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [templateNama, setTemplateNama] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [daftarTemplate, setDaftarTemplate] = useState<TemplateList[]>([]);

  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [newTemplateNama, setNewTemplateNama] = useState("");
  const [newKolom, setNewKolom] = useState<KolomDef[]>([
    { key: "", label: "", tipe: "string", wajib: true },
  ]);
  const [tahunManual, setTahunManual] = useState(
    new Date().getFullYear().toString(),
  );

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

  const handleUpload = async () => {
    if (!kodeLaporan) return alert("Pilih jenis laporan terlebih dahulu!");
    if (!file) return alert("Silakan pilih file Excel terlebih dahulu!");

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kodeLaporan", kodeLaporan);

    try {
      const res = await fetch("/api/upload-preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");

      setPreviewData(data.previewData);
      setTemplateNama(data.templateNama);
    } catch (error: unknown) {
      if (error instanceof Error) alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (id: number, key: string, rawValue: string) => {
    const teksKolom = key.toLowerCase();
    const isNumberColumn = !(
      teksKolom.includes("bulan") ||
      teksKolom.includes("jenis") ||
      teksKolom.includes("tahun") ||
      teksKolom.includes("nama") ||
      teksKolom.includes("npm")
    );

    const cleanValue = isNumberColumn
      ? rawValue.replace(/\./g, "").replace(/,/g, ".")
      : rawValue;

    setPreviewData((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const newData = { ...row.data, [key]: cleanValue };
          const newErrors = { ...row.errors };
          delete newErrors[key];
          return {
            ...row,
            data: newData,
            errors: newErrors,
            hasError: Object.keys(newErrors).length > 0,
          };
        }
        return row;
      }),
    );
  };

  const formatDataLayar = (nilai: unknown, namaKolom: string) => {
    if (nilai === null || nilai === undefined || nilai === "") return "";

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

    const strValue = String(nilai);
    const num = Number(strValue);

    if (!isNaN(num) && strValue.trim() !== "") {
      let formatted = new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 5,
      }).format(num);
      if (strValue.endsWith(".")) formatted += ",";
      return formatted;
    }

    return strValue;
  };

  const handleSimpanFinal = async () => {
    if (previewData.some((row) => row.hasError))
      return alert("Masih ada data merah. Harap perbaiki sebelum menyimpan!");
    setIsLoading(true);
    const cleanDataToSave = previewData.map((row) => row.data);
    try {
      const res = await fetch("/api/simpan-laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeLaporan,
          dataBaris: cleanDataToSave,
          tahun: tahunManual,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(`Sukses! ${result.jumlahDisimpan} baris data tersimpan.`);
      setPreviewData([]);
      setFile(null);
    } catch (error: unknown) {
      if (error instanceof Error) alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimpanTemplateBaru = async () => {
    if (!newTemplateNama) return alert("Nama Laporan wajib diisi!");
    if (newKolom.some((k) => !k.label))
      return alert("Pastikan semua nama kolom terisi!"); // Validasi disederhanakan

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaLaporan: newTemplateNama,
          deskripsi: "Dibuat dari Frontend",
          definisiKolom: newKolom,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Template berhasil dibuat!");
      const autoGeneratedKode = data.data.kodeLaporan;
      setDaftarTemplate((prev) => [
        ...prev,
        { kodeLaporan: autoGeneratedKode, namaLaporan: newTemplateNama },
      ]);
      setKodeLaporan(autoGeneratedKode);
      setIsBuilderMode(false);
      setNewTemplateNama("");
      setNewKolom([{ key: "", label: "", tipe: "string", wajib: true }]);
    } catch (error: unknown) {
      if (error instanceof Error) alert(error.message);
    }
  };

  const kolomKeys =
    previewData.length > 0 ? Object.keys(previewData[0].data) : [];

  return (
    <div className="p-4 md:p-8 w-full xl:max-w-[95%] mx-auto min-h-screen flex flex-col gap-6 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-800">
            {isBuilderMode
              ? "🛠️ Buat Template Laporan"
              : "📤 Upload Data Laporan"}
          </h1>
          <p className="text-muted-foreground">
            {isBuilderMode
              ? "Rancang format kolom Excel untuk pelaporan baru."
              : "Unggah file Excel untuk diproses ke dalam database."}
          </p>
        </div>
        <Button
          variant={isBuilderMode ? "secondary" : "default"}
          onClick={() => setIsBuilderMode(!isBuilderMode)}
          className="shadow-sm"
        >
          {isBuilderMode ? "← Kembali ke Upload" : "+ Buat Laporan Baru"}
        </Button>
      </div>

      {isBuilderMode ? (
        <div className="bg-card text-card-foreground p-6 rounded-xl shadow-sm border">
          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium">Nama Laporan</label>
            <Input
              type="text"
              placeholder="Cth: Rasio Desa Berlistrik"
              value={newTemplateNama}
              onChange={(e) => setNewTemplateNama(e.target.value)}
              className="text-lg font-semibold h-12"
            />
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Definisi Kolom Excel
            </h3>
            {newKolom.map((kolom, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-end bg-muted/30 p-4 rounded-lg border"
              >
                {/* 🔥 HANYA 1 INPUT SEKARANG: Label Tampilan / Nama Kolom Asli */}
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Nama Kolom (Sesuai di Excel)
                  </label>
                  <Input
                    placeholder="Cth: RE PLN (%)"
                    value={kolom.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newArr = [...newKolom];
                      newArr[index].label = val;

                      // 🔥 SISTEM OTOMATIS MEMBUAT KEY:
                      // 1. Lowercase -> 2. Hapus spasi di awal/akhir -> 3. Ganti spasi tengah jadi underscore
                      // Contoh: "RE PLN (%)" -> "re_pln_(%)"
                      newArr[index].key = val
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, "_");

                      setNewKolom(newArr);
                    }}
                  />
                </div>

                <div className="w-full sm:w-48 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tipe Data
                  </label>
                  <Select
                    value={kolom.tipe}
                    onValueChange={(val) => {
                      const newArr = [...newKolom];
                      newArr[index].tipe = val;
                      setNewKolom(newArr);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Teks (String)</SelectItem>
                      <SelectItem value="number">Angka (Number)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32 pb-2 flex items-center justify-between sm:justify-start gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox
                      checked={kolom.wajib}
                      onCheckedChange={(checked) => {
                        const newArr = [...newKolom];
                        newArr[index].wajib = !!checked;
                        setNewKolom(newArr);
                      }}
                    />
                    Wajib Isi
                  </label>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      setNewKolom(newKolom.filter((_, i) => i !== index))
                    }
                    className="sm:hidden"
                  >
                    🗑️
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() =>
                    setNewKolom(newKolom.filter((_, i) => i !== index))
                  }
                  className="hidden sm:flex transition-colors"
                >
                  🗑️
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setNewKolom([
                  ...newKolom,
                  { key: "", label: "", tipe: "string", wajib: true },
                ])
              }
              className="mt-2 font-medium"
            >
              + Tambah Kolom Baru
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSimpanTemplateBaru}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Simpan Template Laporan
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow gap-6">
          <div className="bg-card text-card-foreground p-5 md:p-6 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-800">
                Jenis Laporan
              </label>
              <Select value={kodeLaporan} onValueChange={setKodeLaporan}>
                <SelectTrigger className="font-medium text-gray-900 h-11 bg-gray-50/50">
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
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-800">
                File Excel (.xlsx)
              </label>
              <Input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer h-11 pt-2.5 bg-gray-50/50"
              />
            </div>
            <div className="w-full md:w-32 space-y-2">
              <label className="text-sm font-medium text-gray-800">Tahun</label>
              <Input
                type="number"
                value={tahunManual}
                onChange={(e) => setTahunManual(e.target.value)}
                className="h-11 bg-gray-50/50 font-medium"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full md:w-auto h-11 font-semibold px-8"
            >
              {isLoading ? "Memproses..." : "Upload & Preview"}
            </Button>
          </div>

          {previewData.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border flex flex-col flex-grow overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                <h2 className="font-semibold text-lg text-gray-700">
                  Preview:{" "}
                  <span className="text-primary font-bold">{templateNama}</span>
                </h2>
                <div className="text-sm bg-primary/10 text-primary py-1 px-3 rounded-full font-medium">
                  {previewData.length} Baris Data
                </div>
              </div>

              <div className="overflow-x-auto flex-grow">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap w-[50px] font-semibold text-gray-700 text-center">
                        No
                      </TableHead>
                      {kolomKeys.map((key) => (
                        <TableHead
                          key={key}
                          className="whitespace-nowrap font-semibold text-gray-700"
                        >
                          {/* 🔥 Mengubah "re_pln_(%)" jadi "RE PLN (%)" di layar preview */}
                          {key.replace(/_/g, " ").toUpperCase()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow
                        key={row.id}
                        className={
                          row.hasError
                            ? "bg-destructive/10 hover:bg-destructive/20"
                            : ""
                        }
                      >
                        <TableCell className="font-medium text-center border-b">
                          {index + 1}
                        </TableCell>
                        {kolomKeys.map((key) => {
                          const hasCellError = !!row.errors[key];
                          return (
                            <TableCell
                              key={key}
                              className="p-2 min-w-[150px] border-b"
                            >
                              <div className="relative">
                                <Input
                                  value={formatDataLayar(row.data[key], key)}
                                  onChange={(e) =>
                                    handleCellChange(
                                      row.id,
                                      key,
                                      e.target.value,
                                    )
                                  }
                                  className={`h-9 font-medium text-gray-700 ${hasCellError ? "border-destructive text-destructive focus-visible:ring-destructive" : "bg-transparent border-transparent hover:border-gray-300 focus:bg-white"}`}
                                />
                              </div>
                              {hasCellError && (
                                <p className="text-[11px] text-destructive mt-1 font-medium ml-1">
                                  {row.errors[key]}
                                </p>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t flex justify-end bg-muted/20">
                <Button
                  onClick={handleSimpanFinal}
                  disabled={isLoading}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  Konfirmasi & Simpan Data
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
