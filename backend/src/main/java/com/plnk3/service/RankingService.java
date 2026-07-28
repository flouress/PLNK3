package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.RankingGroup;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class RankingService {

    private final Sheets sheetsService;
    private final String spreadsheetId;

    public RankingService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Mengambil data ranking dari Google Sheets dan mengubahnya menjadi
     * nested JSON berdasarkan unit (misal: YANTEK, TEKNIK, dll).
     *
     * Struktur di Sheets:
     * - Baris header unit: hanya kolom pertama terisi nama unit (misal "YANTEK")
     * - Baris data: RANK | NAMA | JUMLAH
     *
     * Hasil: List<RankingGroup> di mana setiap group punya unitName dan list rankings.
     */
    public List<RankingGroup> getData() throws IOException {
        String range = "Ranking!A:C";
        List<List<Object>> values = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute()
                .getValues();

        if (values == null || values.isEmpty()) {
            return new ArrayList<>();
        }

        List<RankingGroup> groups = new ArrayList<>();
        RankingGroup currentGroup = null;

        for (int i = 0; i < values.size(); i++) {
            List<Object> row = values.get(i);

            if (row.isEmpty()) continue;

            String firstCell = row.get(0).toString().trim();

            // Skip header row "RANK" / "NAMA" / "JUMLAH"
            if (firstCell.equalsIgnoreCase("RANK")) continue;

            // Deteksi baris header unit:
            // Jika hanya kolom pertama terisi ATAU kolom 2 & 3 kosong → ini nama unit
            boolean isUnitHeader = isUnitHeaderRow(row, firstCell);

            if (isUnitHeader) {
                currentGroup = new RankingGroup(firstCell, new ArrayList<>());
                groups.add(currentGroup);
            } else if (currentGroup != null) {
                // Baris data ranking
                try {
                    int rank = parseIntSafe(firstCell);
                    String nama = getCell(row, 1);
                    int jumlah = parseIntSafe(getCell(row, 2));
                    currentGroup.getRankings().add(
                            new RankingGroup.RankingEntry(rank, nama, jumlah));
                } catch (NumberFormatException e) {
                    // Jika tidak bisa di-parse sebagai angka, mungkin ini unit header
                    // dengan format berbeda — buat group baru
                    currentGroup = new RankingGroup(firstCell, new ArrayList<>());
                    groups.add(currentGroup);
                }
            }
        }

        return groups;
    }

    /**
     * Mendeteksi apakah sebuah baris adalah header nama unit.
     * Header unit biasanya: hanya kolom pertama berisi teks non-numerik,
     * kolom lainnya kosong.
     */
    private boolean isUnitHeaderRow(List<Object> row, String firstCell) {
        // Jika firstCell adalah angka, bukan unit header
        try {
            Integer.parseInt(firstCell);
            return false;
        } catch (NumberFormatException e) {
            // Bukan angka — cek apakah kolom lain kosong
        }

        // Jika row hanya punya 1 cell, atau cell lain kosong → unit header
        if (row.size() <= 1) return true;

        for (int i = 1; i < row.size(); i++) {
            if (row.get(i) != null && !row.get(i).toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private int parseIntSafe(String value) {
        if (value == null || value.trim().isEmpty()) return 0;
        return Integer.parseInt(value.trim());
    }

    private String getCell(List<Object> row, int index) {
        return (row != null && index < row.size() && row.get(index) != null)
                ? row.get(index).toString()
                : "";
    }
}
