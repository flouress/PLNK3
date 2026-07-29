package com.plnk3.controller;

import com.plnk3.model.RankingGroup;
import com.plnk3.service.RankingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/ranking")
public class RankingController {

    private static final Logger log = LoggerFactory.getLogger(RankingController.class);

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping
    public ResponseEntity<?> getRankingData() {
        try {
            List<RankingGroup> data = rankingService.getData();
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            log.error("Gagal mengambil data Ranking", e);
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data. Silakan coba lagi.\"}");
        }
    }
}

