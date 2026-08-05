package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.CvvRecord;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CvvService {

    private final Sheets sheetsService;
    private final String spreadsheetId;


    public CvvService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    private List<CvvRecord> cachedData = null;
    private long lastCacheTime = 0;
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000; // 5 menit

    /**
     * Mengambil data CVV dari Google Sheets (multi-tab per bulan) dengan optional filter tanggal.
     */
    public List<CvvRecord> getData(String startDate, String endDate, Integer month, Integer year) throws IOException {
        List<CvvRecord> allData;

        if (cachedData != null && (System.currentTimeMillis() - lastCacheTime) < CACHE_DURATION_MS) {
            allData = cachedData;
        } else {
            try {
                String range = "CCV!A:F";
                List<List<Object>> values = sheetsService.spreadsheets().values()
                        .get(spreadsheetId, range)
                        .execute()
                        .getValues();

                if (values == null || values.size() <= 1) {
                    allData = new ArrayList<>();
                } else {
                    List<CvvRecord> records = new ArrayList<>();
                    // Start from index 1 to skip header row
                    for (int i = 1; i < values.size(); i++) {
                        List<Object> row = values.get(i);
                        // Cek kalau baris kosong (kolom pertama timestamp tidak ada)
                        if (row == null || row.isEmpty() || getCell(row, 0).trim().isEmpty()) {
                            continue;
                        }
                        CvvRecord record = new CvvRecord(
                                getCell(row, 0),
                                getCell(row, 1),
                                getCell(row, 2),
                                getCell(row, 3),
                                getCell(row, 4),
                                getCell(row, 5)
                        );
                        records.add(record);
                    }
                    allData = records;
                }

                cachedData = allData;
                lastCacheTime = System.currentTimeMillis();
            } catch (Exception e) {
                // Gunakan cache lama jika ada, atau list kosong jika error
                if (cachedData != null) {
                    allData = cachedData;
                } else {
                    allData = new ArrayList<>();
                }
            }
        }

        return applyFilters(allData, startDate, endDate, month, year);
    }

    private List<CvvRecord> applyFilters(List<CvvRecord> records,
                                          String startDate, String endDate, Integer month, Integer year) {
        if (startDate == null && endDate == null && month == null && year == null) {
            return records;
        }

        DateTimeFormatter apiDateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        return records.stream().filter(record -> {
            LocalDateTime recordDate = parseDate(record.getTimestamp());
            if (recordDate == null) {
                return false; // Abaikan jika tidak ada timestamp valid saat memfilter
            }

            // Filter by date range
            if (startDate != null && endDate != null) {
                try {
                    LocalDateTime start = java.time.LocalDate.parse(startDate, apiDateFormat).atStartOfDay();
                    LocalDateTime end = java.time.LocalDate.parse(endDate, apiDateFormat).atTime(23, 59, 59);
                    if (recordDate.isBefore(start) || recordDate.isAfter(end)) {
                        return false;
                    }
                } catch (Exception e) {}
            }

            // Filter by month
            if (month != null) {
                if (recordDate.getMonthValue() != month) {
                    return false;
                }
            }

            // Filter by year
            if (year != null) {
                if (recordDate.getYear() != year) {
                    return false;
                }
            }

            return true;
        }).collect(Collectors.toList());
    }

    private LocalDateTime parseDate(String timestamp) {
        if (timestamp == null || timestamp.trim().isEmpty()) return null;
        try {
            // Extract the date part assuming format "MM/DD/YYYY HH:MM:SS" or "MM/DD/YYYY"
            String datePart = timestamp.split(" ")[0];
            String[] parts;
            if (datePart.contains("/")) {
                parts = datePart.split("/");
            } else if (datePart.contains("-")) {
                parts = datePart.split("-");
            } else {
                return null;
            }
            
            // Format is strictly MM/DD/YYYY (or MM-DD-YYYY)
            int month = Integer.parseInt(parts[0]);
            int day = Integer.parseInt(parts[1]);
            int year = Integer.parseInt(parts[2]);
            
            return LocalDateTime.of(year, month, day, 0, 0);
        } catch (Exception e) {
            return null;
        }
    }

    private String getCell(List<Object> row, int index) {
        return (row != null && index < row.size() && row.get(index) != null)
                ? row.get(index).toString()
                : "";
    }
}
