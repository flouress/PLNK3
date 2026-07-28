package com.plnk3.model;

public class CvvRecord {
    private String timestamp;
    private String namaObserver;
    private String perusahaan;
    private String jabatanObserver;
    private String pekerjaanPadaBagian;
    private String namaUnit;

    public CvvRecord() {}

    public CvvRecord(String timestamp, String namaObserver, String perusahaan,
                     String jabatanObserver, String pekerjaanPadaBagian, String namaUnit) {
        this.timestamp = timestamp;
        this.namaObserver = namaObserver;
        this.perusahaan = perusahaan;
        this.jabatanObserver = jabatanObserver;
        this.pekerjaanPadaBagian = pekerjaanPadaBagian;
        this.namaUnit = namaUnit;
    }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getNamaObserver() { return namaObserver; }
    public void setNamaObserver(String namaObserver) { this.namaObserver = namaObserver; }

    public String getPerusahaan() { return perusahaan; }
    public void setPerusahaan(String perusahaan) { this.perusahaan = perusahaan; }

    public String getJabatanObserver() { return jabatanObserver; }
    public void setJabatanObserver(String jabatanObserver) { this.jabatanObserver = jabatanObserver; }

    public String getPekerjaanPadaBagian() { return pekerjaanPadaBagian; }
    public void setPekerjaanPadaBagian(String pekerjaanPadaBagian) { this.pekerjaanPadaBagian = pekerjaanPadaBagian; }

    public String getNamaUnit() { return namaUnit; }
    public void setNamaUnit(String namaUnit) { this.namaUnit = namaUnit; }
}
