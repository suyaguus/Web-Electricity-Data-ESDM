// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";

type TemplateList = {
  kodeLaporan: string;
  namaLaporan: string;
};

// ESLint Clean: Menggunakan 'unknown' alih-alih 'any'
type DataRow = Record<string, unknown>;

export default function DashboardPage() {
  const [daftarTemplate, setDaftarTemplate] = useState<TemplateList[]>([]);
  const [kodeLaporan, setKodeLaporan] = useState("");
  const [tahunPilih, setTahunPilih] = useState("Semua");
  const [opsiTahun, setOpsiTahun] = useState<string[]>([]);
  const [dataLaporan, setDataLaporan] = useState<DataRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setDaftarTemplate(data);
          if (data.length > 0) {
            setKodeLaporan(data[0].kodeLaporan);
          }
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

  const kolomDinamis =
    dataLaporan.length > 0
      ? Object.keys(dataLaporan[0]).filter(
          (key) => key !== "idDb" && key !== "tanggalUpload",
        )
      : [];

  return (
    // Menggunakan w-full dan pembatasan lebar 95% agar lebih lega di layar komputer
    <div className="p-4 md:p-8 w-full xl:max-w-[95%] mx-auto min-h-screen bg-gray-50 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          📊 Dashboard Laporan
        </h1>
        <p className="text-gray-500">
          Lihat dan pantau semua data yang telah masuk ke sistem.
        </p>
      </div>

      {/* Kontrol Filter - Menjadi kolom di HP, baris di PC */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jenis Laporan:
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={kodeLaporan}
            onChange={(e) => {
              setKodeLaporan(e.target.value);
              setTahunPilih("Semua");
            }}
          >
            {daftarTemplate.map((tpl) => (
              <option key={tpl.kodeLaporan} value={tpl.kodeLaporan}>
                {tpl.namaLaporan}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-56">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tahun / Periode:
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={tahunPilih}
            onChange={(e) => setTahunPilih(e.target.value)}
          >
            <option value="Semua">Semua Tahun</option>
            {opsiTahun.map((tahun) => (
              <option key={tahun} value={tahun}>
                {tahun}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Area Menampilkan Tabel */}
      {/* min-h-[500px] memastikan kotak ini tidak pernah menciut lebih kecil dari 500px */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow flex flex-col min-h-[500px]">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="animate-pulse font-medium">Memuat data...</span>
            </div>
          </div>
        ) : dataLaporan.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4 opacity-50">📂</div>
            <p className="text-lg font-medium text-gray-500">
              Belum ada data untuk laporan ini.
            </p>
            <p className="text-sm mt-1">
              Silakan upload file Excel terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-800 text-white flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="font-semibold text-lg">
                Total Data:{" "}
                <span className="text-blue-300">{dataLaporan.length}</span>{" "}
                baris
              </h2>
              <button className="bg-white text-gray-800 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-100 transition-colors shadow-sm active:scale-95">
                ⬇ Export ke Excel
              </button>
            </div>

            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">
                      No
                    </th>
                    {kolomDinamis.map((kolom) => (
                      <th
                        key={kolom}
                        className="px-6 py-4 font-semibold whitespace-nowrap"
                      >
                        {kolom.replace(/_/g, " ")}{" "}
                        {/* Opsional: Membuat header pakai underscore jadi lebih rapi */}
                      </th>
                    ))}
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">
                      Tanggal Upload
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dataLaporan.map((row, index) => (
                    <tr
                      key={row.idDb as string}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {index + 1}
                      </td>

                      {kolomDinamis.map((kolom) => (
                        <td key={kolom} className="px-6 py-4 whitespace-nowrap">
                          {row[kolom] !== null && row[kolom] !== undefined
                            ? String(row[kolom])
                            : "-"}
                        </td>
                      ))}

                      <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
