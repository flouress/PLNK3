package com.plnk3.model;

public class PsaRecord {
    private String timestamp;
    private String namaInspektor;
    private String jabatanInspektor;
    private String periodeInspeksi;
    private String namaUnit;

    public PsaRecord() {}

    public PsaRecord(String timestamp, String namaInspektor, String jabatanInspektor,
                     String periodeInspeksi, String namaUnit) {
        this.timestamp = timestamp;
        this.namaInspektor = namaInspektor;
        this.jabatanInspektor = jabatanInspektor;
        this.periodeInspeksi = periodeInspeksi;
        this.namaUnit = namaUnit;
    }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getNamaInspektor() { return namaInspektor; }
    public void setNamaInspektor(String namaInspektor) { this.namaInspektor = namaInspektor; }

    public String getJabatanInspektor() { return jabatanInspektor; }
    public void setJabatanInspektor(String jabatanInspektor) { this.jabatanInspektor = jabatanInspektor; }

    public String getPeriodeInspeksi() { return periodeInspeksi; }
    public void setPeriodeInspeksi(String periodeInspeksi) { this.periodeInspeksi = periodeInspeksi; }

    public String getNamaUnit() { return namaUnit; }
    public void setNamaUnit(String namaUnit) { this.namaUnit = namaUnit; }
}
