package com.plnk3.model;

import java.util.List;

public class RankingGroup {
    private String unitName;
    private List<RankingEntry> rankings;

    public RankingGroup() {}

    public RankingGroup(String unitName, List<RankingEntry> rankings) {
        this.unitName = unitName;
        this.rankings = rankings;
    }

    public String getUnitName() { return unitName; }
    public void setUnitName(String unitName) { this.unitName = unitName; }

    public List<RankingEntry> getRankings() { return rankings; }
    public void setRankings(List<RankingEntry> rankings) { this.rankings = rankings; }

    public static class RankingEntry {
        private int rank;
        private String nama;
        private int jumlah;

        public RankingEntry() {}

        public RankingEntry(int rank, String nama, int jumlah) {
            this.rank = rank;
            this.nama = nama;
            this.jumlah = jumlah;
        }

        public int getRank() { return rank; }
        public void setRank(int rank) { this.rank = rank; }

        public String getNama() { return nama; }
        public void setNama(String nama) { this.nama = nama; }

        public int getJumlah() { return jumlah; }
        public void setJumlah(int jumlah) { this.jumlah = jumlah; }
    }
}
