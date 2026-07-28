package com.plnk3.model;

public class BrosurRecord {
    private String tanggal;
    private String pekerjaan;
    private String pelaksana;

    public BrosurRecord() {}

    public BrosurRecord(String tanggal, String pekerjaan, String pelaksana) {
        this.tanggal = tanggal;
        this.pekerjaan = pekerjaan;
        this.pelaksana = pelaksana;
    }

    public String getTanggal() { return tanggal; }
    public void setTanggal(String tanggal) { this.tanggal = tanggal; }

    public String getPekerjaan() { return pekerjaan; }
    public void setPekerjaan(String pekerjaan) { this.pekerjaan = pekerjaan; }

    public String getPelaksana() { return pelaksana; }
    public void setPelaksana(String pelaksana) { this.pelaksana = pelaksana; }
}
