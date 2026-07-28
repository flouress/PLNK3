package com.plnk3.controller;

import com.plnk3.model.BrosurRecord;
import com.plnk3.service.BrosurService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/brosur")
public class BrosurController {

    private final BrosurService brosurService;

    public BrosurController(BrosurService brosurService) {
        this.brosurService = brosurService;
    }

    @GetMapping
    public ResponseEntity<?> getBrosurData() {
        try {
            List<BrosurRecord> data = brosurService.getData();
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data Brosur: " + e.getMessage() + "\"}");
        }
    }
}
