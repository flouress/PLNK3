package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.BrosurRecord;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class BrosurService {

    private final Sheets sheetsService;
    private final String spreadsheetId;

    public BrosurService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Mengambil semua data Brosur dari Google Sheets.
     * Tidak ada filter karena format tanggal di tab Brosur bersifat manual/tidak konsisten.
     */
    public List<BrosurRecord> getData() throws IOException {
        String range = "Brosur!B:D";
        List<List<Object>> values = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute()
                .getValues();

        if (values == null || values.size() <= 1) {
            return new ArrayList<>();
        }

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

        return records;
    }

    private String getCell(List<Object> row, int index) {
        return (row != null && index < row.size() && row.get(index) != null)
                ? row.get(index).toString()
                : "";
    }
}
