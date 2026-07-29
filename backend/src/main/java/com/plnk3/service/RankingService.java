package com.plnk3.service;

import com.plnk3.model.BrosurRecord;
import com.plnk3.model.CvvRecord;
import com.plnk3.model.PsaRecord;
import com.plnk3.model.RankingGroup;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

@Service
public class RankingService {

    private final PsaService psaService;
    private final CvvService cvvService;
    private final BrosurService brosurService;

    public RankingService(PsaService psaService, CvvService cvvService, BrosurService brosurService) {
        this.psaService = psaService;
        this.cvvService = cvvService;
        this.brosurService = brosurService;
    }

    public List<RankingGroup> getData(String startDate, String endDate, Integer month) throws IOException {
        List<PsaRecord> psaData = psaService.getData(startDate, endDate, month);
        List<CvvRecord> cvvData = cvvService.getData(startDate, endDate, month);
        List<BrosurRecord> brosurData = brosurService.getData(startDate, endDate, month);

        List<RankingGroup> groups = new ArrayList<>();

        // 1. Ranking PSA
        Map<String, Integer> psaScores = new HashMap<>();
        for (PsaRecord r : psaData) {
            String reporter = (r.getNamaInspektor() == null || r.getNamaInspektor().trim().isEmpty()) ? "Tidak Diketahui" : r.getNamaInspektor().trim();
            psaScores.put(reporter, psaScores.getOrDefault(reporter, 0) + 1);
        }
        groups.add(createRankingGroup("Ranking PSA", psaScores));

        // 2. Ranking CVV
        Map<String, Integer> cvvScores = new HashMap<>();
        for (CvvRecord r : cvvData) {
            String reporter = (r.getNamaObserver() == null || r.getNamaObserver().trim().isEmpty()) ? "Tidak Diketahui" : r.getNamaObserver().trim();
            cvvScores.put(reporter, cvvScores.getOrDefault(reporter, 0) + 1);
        }
        groups.add(createRankingGroup("Ranking CVV", cvvScores));

        // 3. Ranking Brosur
        Map<String, Integer> brosurScores = new HashMap<>();
        for (BrosurRecord r : brosurData) {
            String reporter = (r.getPelaksana() == null || r.getPelaksana().trim().isEmpty()) ? "Tidak Diketahui" : r.getPelaksana().trim();
            brosurScores.put(reporter, brosurScores.getOrDefault(reporter, 0) + 1);
        }
        groups.add(createRankingGroup("Ranking Brosur", brosurScores));

        return groups;
    }

    private RankingGroup createRankingGroup(String groupName, Map<String, Integer> scores) {
        List<Map.Entry<String, Integer>> sortedReporters = new ArrayList<>(scores.entrySet());
        // Sort descending by score
        sortedReporters.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        List<RankingGroup.RankingEntry> rankings = new ArrayList<>();
        int lastScore = -1;
        int currentRank = 1;

        for (int i = 0; i < sortedReporters.size(); i++) {
            Map.Entry<String, Integer> reporterEntry = sortedReporters.get(i);
            int score = reporterEntry.getValue();
            
            if (score != lastScore) {
                currentRank = i + 1;
                lastScore = score;
            }
            
            rankings.add(new RankingGroup.RankingEntry(currentRank, reporterEntry.getKey(), score));
        }

        return new RankingGroup(groupName, rankings);
    }
}
