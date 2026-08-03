package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.BrosurRecord;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BrosurService {

    private final Sheets sheetsService;
    private final String spreadsheetId;

    public BrosurService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    private List<BrosurRecord> cachedData = null;
    private long lastCacheTime = 0;
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000; // 5 menit

    /**
     * Mengambil semua data Brosur dari Google Sheets.
     * Tidak ada filter karena format tanggal di tab Brosur bersifat manual/tidak konsisten.
     */
    public List<BrosurRecord> getData(String startDate, String endDate, Integer month, Integer year) throws IOException {
        List<BrosurRecord> allData;

        if (cachedData != null && (System.currentTimeMillis() - lastCacheTime) < CACHE_DURATION_MS) {
            allData = cachedData;
        } else {
            try {
                String range = "Brosur!B:D";
                List<List<Object>> values = sheetsService.spreadsheets().values()
                        .get(spreadsheetId, range)
                        .execute()
                        .getValues();

                if (values == null || values.size() <= 1) {
                    allData = new ArrayList<>();
                } else {
                    List<BrosurRecord> records = new ArrayList<>();
                    for (int i = 1; i < values.size(); i++) {
                        List<Object> row = values.get(i);
                        BrosurRecord record = new BrosurRecord(
                                getCell(row, 0),
                                getCell(row, 1),
                                getCell(row, 2)
                        );
                        records.add(record);
                    }
                    allData = records;
                }

                cachedData = allData;
                lastCacheTime = System.currentTimeMillis();
            } catch (Exception e) {
                // Gunakan cache lama jika ada, atau list kosong jika error (misal sheet tidak ada)
                if (cachedData != null) {
                    allData = cachedData;
                } else {
                    allData = new ArrayList<>();
                }
            }
        }

        return applyFilters(allData, startDate, endDate, month, year);
    }

    private List<BrosurRecord> applyFilters(List<BrosurRecord> records,
                                          String startDate, String endDate, Integer month, Integer year) {
        if (startDate == null && endDate == null && month == null && year == null) {
            return records;
        }

        DateTimeFormatter apiDateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        return records.stream().filter(record -> {
            LocalDateTime recordDate = parseDate(record.getTanggal());
            if (recordDate == null) {
                return true; 
            }

            if (startDate != null && endDate != null) {
                try {
                    LocalDateTime start = java.time.LocalDate.parse(startDate, apiDateFormat).atStartOfDay();
                    LocalDateTime end = java.time.LocalDate.parse(endDate, apiDateFormat).atTime(23, 59, 59);
                    if (recordDate.isBefore(start) || recordDate.isAfter(end)) {
                        return false;
                    }
                } catch (Exception e) {}
            }

            if (month != null) {
                if (recordDate.getMonthValue() != month) {
                    return false;
                }
            }

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
            String datePart = timestamp.split(" ")[0];
            String[] parts;
            if (datePart.contains("/")) {
                parts = datePart.split("/");
            } else if (datePart.contains("-")) {
                parts = datePart.split("-");
            } else {
                return null;
            }
            int year, month, day;
            if (parts[0].length() == 4) {
                year = Integer.parseInt(parts[0]);
                month = Integer.parseInt(parts[1]);
                day = Integer.parseInt(parts[2]);
            } else {
                day = Integer.parseInt(parts[0]);
                month = Integer.parseInt(parts[1]);
                year = Integer.parseInt(parts[2]);
            }
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
