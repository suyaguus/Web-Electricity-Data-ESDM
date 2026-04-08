// src/app/upload/page.tsx
"use client";

import { useState, useEffect } from "react";

// --- TYPE DEFINITIONS ---
type PreviewRow = {
  id: number;
  data: Record<string, string | number>;
  hasError: boolean;
  errors: Record<string, string>;
};

type KolomDef = {
  key: string;
  label: string;
  tipe: string;
  wajib: boolean;
};

type TemplateList = {
  kodeLaporan: string;
  namaLaporan: string;
};

export default function UploadPage() {
  // --- STATES UNTUK MODE UPLOAD ---
  const [file, setFile] = useState<File | null>(null);
  const [kodeLaporan, setKodeLaporan] = useState("");
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [templateNama, setTemplateNama] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [daftarTemplate, setDaftarTemplate] = useState<TemplateList[]>([
    {
      kodeLaporan: "KONSUMSI_PERKAPITA",
      namaLaporan: "Konsumsi Listrik Perkapita",
    }, // Default sementara
  ]);

  // --- STATES UNTUK MODE BUILDER (TEMPLATE BARU) ---
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [newTemplateNama, setNewTemplateNama] = useState("");
  const [newKolom, setNewKolom] = useState<KolomDef[]>([
    { key: "", label: "", tipe: "string", wajib: true },
  ]);
  const [tahunManual, setTahunManual] = useState(
    new Date().getFullYear().toString(),
  );

  // Fetch daftar template dari API saat halaman dimuat
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setDaftarTemplate(data);

          // Pilih otomatis template pertama jika ada
          if (data.length > 0 && !kodeLaporan) {
            setKodeLaporan(data[0].kodeLaporan);
          }
        }
      } catch (error) {
        console.error("Gagal memuat template:", error);
      }
    };

    fetchTemplates();
  }, []);

  // --- FUNGSI UPLOAD & PREVIEW ---
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

  const handleCellChange = (id: number, key: string, value: string) => {
    setPreviewData((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const newData = { ...row.data, [key]: value };
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

  // --- FUNGSI UNTUK SUBMIT KE DATABASE ---
  const handleSimpanFinal = async () => {
    if (previewData.some((row) => row.hasError)) {
      return alert(
        "Masih ada data yang tidak valid (warna merah). Harap perbaiki sebelum menyimpan!",
      );
    }

    const cleanDataToSave = previewData.map((row) => row.data);
    setIsLoading(true);

    try {
      const res = await fetch("/api/simpan-laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeLaporan: kodeLaporan,
          dataBaris: cleanDataToSave,
          tahun: tahunManual,
        }),
      });

      const result = await res.json();

      if (!res.ok)
        throw new Error(result.error || "Terjadi kesalahan saat menyimpan");

      alert(
        `Sukses! ${result.jumlahDisimpan} baris data berhasil disimpan ke database.`,
      );
      setPreviewData([]);
      setFile(null);
    } catch (error: unknown) {
      if (error instanceof Error) alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI BUILDER TEMPLATE ---
  const handleSimpanTemplateBaru = async () => {
    if (!newTemplateNama) return alert("Nama Laporan wajib diisi!");
    if (newKolom.some((k) => !k.key || !k.label))
      return alert("Pastikan semua key dan label kolom terisi!");

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaLaporan: newTemplateNama, // Hanya mengirim nama
          deskripsi: "Dibuat dari Frontend",
          definisiKolom: newKolom,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Template berhasil dibuat!");

      // Mengambil kodeLaporan yang digenerate otomatis dari respons backend
      const autoGeneratedKode = data.data.kodeLaporan;

      setDaftarTemplate([
        ...daftarTemplate,
        { kodeLaporan: autoGeneratedKode, namaLaporan: newTemplateNama },
      ]);
      setKodeLaporan(autoGeneratedKode); // Langsung pilih template baru ini
      setIsBuilderMode(false);
      setNewTemplateNama(""); // Reset form nama
      setNewKolom([{ key: "", label: "", tipe: "string", wajib: true }]); // Reset kolom
    } catch (error: unknown) {
      if (error instanceof Error) alert(error.message);
    }
  };

  // --- RENDER UI ---
  const kolomKeys =
    previewData.length > 0 ? Object.keys(previewData[0].data) : [];

  return (
    // Sama seperti dashboard: Menggunakan w-full dan pembatasan lebar 95%
    <div className="p-4 md:p-8 w-full xl:max-w-[95%] mx-auto min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {isBuilderMode
            ? "🛠️ Buat Template Laporan Baru"
            : "📤 Upload Data Laporan"}
        </h1>
        <button
          onClick={() => setIsBuilderMode(!isBuilderMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm active:scale-95 whitespace-nowrap ${
            isBuilderMode
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          }`}
        >
          {isBuilderMode ? "← Kembali ke Upload" : "+ Buat Laporan Baru"}
        </button>
      </div>

      {/* ================= MODE BUILDER ================= */}
      {isBuilderMode ? (
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Laporan
            </label>
            <input
              type="text"
              placeholder="Cth: Rasio Desa Berlistrik"
              value={newTemplateNama}
              onChange={(e) => setNewTemplateNama(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-semibold transition-all"
            />
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              Definisi Kolom Excel
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Tentukan kolom apa saja yang harus ada di dalam file Excel saat
              admin melakukan upload.
            </p>

            {newKolom.map((kolom, index) => (
              // Responsif: Susun ke bawah di HP (flex-col), menyamping di PC (sm:flex-row)
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-3 mb-3 items-start sm:items-end bg-gray-50 p-4 rounded-lg border border-gray-100"
              >
                <div className="flex-1 w-full sm:w-auto">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Key Header Excel (Tanpa Spasi)
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: jml_penduduk"
                    value={kolom.key}
                    onChange={(e) => {
                      const newArr = [...newKolom];
                      newArr[index].key = e.target.value;
                      setNewKolom(newArr);
                    }}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Label Tampilan (Di Tabel)
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: Jumlah Penduduk"
                    value={kolom.label}
                    onChange={(e) => {
                      const newArr = [...newKolom];
                      newArr[index].label = e.target.value;
                      setNewKolom(newArr);
                    }}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Tipe Data
                  </label>
                  <select
                    value={kolom.tipe}
                    onChange={(e) => {
                      const newArr = [...newKolom];
                      newArr[index].tipe = e.target.value;
                      setNewKolom(newArr);
                    }}
                    className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="string">Teks (String)</option>
                    <option value="number">Angka (Number)</option>
                  </select>
                </div>
                <div className="w-full sm:w-24 pb-0 sm:pb-2 flex items-center justify-between sm:justify-start">
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={kolom.wajib}
                      onChange={(e) => {
                        const newArr = [...newKolom];
                        newArr[index].wajib = e.target.checked;
                        setNewKolom(newArr);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />{" "}
                    Wajib Isi?
                  </label>
                  {/* Tombol hapus di HP muncul di kanan atas baris ini */}
                  <button
                    onClick={() =>
                      setNewKolom(newKolom.filter((_, i) => i !== index))
                    }
                    className="sm:hidden p-2 text-red-500 hover:bg-red-50 rounded"
                    title="Hapus Kolom"
                  >
                    🗑️
                  </button>
                </div>
                {/* Tombol hapus di PC muncul di ujung kanan */}
                <button
                  onClick={() =>
                    setNewKolom(newKolom.filter((_, i) => i !== index))
                  }
                  className="hidden sm:block p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Hapus Kolom"
                >
                  🗑️
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setNewKolom([
                  ...newKolom,
                  { key: "", label: "", tipe: "string", wajib: true },
                ])
              }
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 mt-2 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
            >
              + Tambah Kolom Baru
            </button>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSimpanTemplateBaru}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-sm transition-transform active:scale-95"
            >
              Simpan Template Laporan
            </button>
          </div>
        </div>
      ) : (
        /* ================= MODE UPLOAD (DEFAULT) ================= */
        <div className="flex flex-col flex-grow">
          {/* Form Upload Responsif: flex-col di HP, md:flex-row di PC */}
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Laporan
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={kodeLaporan}
                onChange={(e) => setKodeLaporan(e.target.value)}
              >
                <option value="" disabled>
                  -- Pilih Jenis Laporan --
                </option>
                {daftarTemplate.map((tpl) => (
                  <option key={tpl.kodeLaporan} value={tpl.kodeLaporan}>
                    {tpl.namaLaporan}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Excel (.xlsx / .csv)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              />
            </div>

            <div className="w-full md:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahun Laporan
              </label>
              <input
                type="number"
                value={tahunManual}
                onChange={(e) => setTahunManual(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="2026"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-transform active:scale-95 disabled:bg-gray-400 disabled:transform-none whitespace-nowrap"
            >
              {isLoading ? "Memproses..." : "Upload & Preview"}
            </button>
          </div>

          {/* TABEL PREVIEW */}
          {previewData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-grow">
              <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                <h2 className="font-semibold text-lg">
                  Preview: <span className="text-blue-300">{templateNama}</span>
                </h2>
                <span className="text-sm bg-gray-700 text-gray-200 py-1 px-3 rounded-full font-medium">
                  {previewData.length} Baris Data
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">
                        No
                      </th>
                      {kolomKeys.map((key) => (
                        <th
                          key={key}
                          className="px-6 py-4 font-semibold whitespace-nowrap"
                        >
                          {key.replace(/_/g, " ")} {/* Mempercantik header */}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          row.hasError
                            ? "bg-red-50 hover:bg-red-100"
                            : "hover:bg-blue-50/50"
                        }`}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {index + 1}
                        </td>
                        {kolomKeys.map((key) => {
                          const hasCellError = !!row.errors[key];
                          return (
                            <td
                              key={key}
                              className="px-4 py-2 whitespace-nowrap"
                            >
                              {/* min-w-[120px] mencegah input terkompresi saat kolom sangat banyak */}
                              <div className="relative min-w-[120px] md:min-w-[150px]">
                                <input
                                  type="text"
                                  value={
                                    row.data[key] !== undefined &&
                                    row.data[key] !== null
                                      ? String(row.data[key])
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleCellChange(
                                      row.id,
                                      key,
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full px-3 py-2 rounded border outline-none transition-all ${
                                    hasCellError
                                      ? "border-red-400 bg-white text-red-700 focus:ring-2 focus:ring-red-200 shadow-sm"
                                      : "border-transparent bg-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:shadow-sm"
                                  }`}
                                />
                                {hasCellError && (
                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                  </span>
                                )}
                              </div>
                              {hasCellError && (
                                <p className="text-[11px] text-red-600 mt-1 font-medium ml-1">
                                  {row.errors[key]}
                                </p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSimpanFinal}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-sm transition-transform active:scale-95"
                >
                  Konfirmasi & Simpan Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
