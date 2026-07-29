package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.PsaRecord;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PsaService {

    private final Sheets sheetsService;
    private final String spreadsheetId;



    public PsaService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Mengambil data PSA dari Google Sheets dengan optional filter tanggal.
     *
     * @param startDate filter mulai tanggal (format: yyyy-MM-dd), nullable
     * @param endDate   filter sampai tanggal (format: yyyy-MM-dd), nullable
     * @param month     filter bulan spesifik (1-12), nullable
     */
    public List<PsaRecord> getData(String startDate, String endDate, Integer month) throws IOException {
        String range = "PSA!A:E";
        List<List<Object>> values = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute()
                .getValues();

        if (values == null || values.size() <= 1) {
            return new ArrayList<>();
        }

        // Skip header row, map ke PsaRecord
        List<PsaRecord> records = new ArrayList<>();
        for (int i = 1; i < values.size(); i++) {
            List<Object> row = values.get(i);
            PsaRecord record = new PsaRecord(
                    getCell(row, 0),
                    getCell(row, 1),
                    getCell(row, 2),
                    getCell(row, 3),
                    getCell(row, 4)
            );
            records.add(record);
        }

        // Apply filters jika ada
        return applyFilters(records, startDate, endDate, month);
    }

    private List<PsaRecord> applyFilters(List<PsaRecord> records,
                                          String startDate, String endDate, Integer month) {
        if (startDate == null && endDate == null && month == null) {
            return records;
        }

        DateTimeFormatter apiDateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        return records.stream().filter(record -> {
            LocalDateTime recordDate = parseDate(record.getTimestamp());
            if (recordDate == null) {
                return true; // Jika tidak ada timestamp, anggap masuk
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
