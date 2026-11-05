import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

OUTPUT_DIR = r"D:\Pekerjaan\SIM-RIDA 2\DOKUMEN_PERIKATAN_BRIDA"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_styles():
    styles = getSampleStyleSheet()
    
    kop_title = ParagraphStyle(
        'KopTitle',
        parent=styles['Heading1'],
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        fontName='Helvetica-Bold'
    )
    kop_sub = ParagraphStyle(
        'KopSub',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=1,
        fontName='Helvetica'
    )
    doc_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0f2942'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    doc_subtitle = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica'
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body,
        fontName='Helvetica-Bold'
    )
    body_center = ParagraphStyle(
        'BodyCenter',
        parent=body,
        alignment=1
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica'
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold'
    )
    table_cell_center = ParagraphStyle(
        'TableCellCenter',
        parent=table_cell,
        alignment=1
    )
    table_cell_right = ParagraphStyle(
        'TableCellRight',
        parent=table_cell,
        alignment=2
    )

    return {
        'kop_title': kop_title,
        'kop_sub': kop_sub,
        'doc_title': doc_title,
        'doc_subtitle': doc_subtitle,
        'body': body,
        'body_bold': body_bold,
        'body_center': body_center,
        'table_cell': table_cell,
        'table_cell_bold': table_cell_bold,
        'table_cell_center': table_cell_center,
        'table_cell_right': table_cell_right,
    }

def add_header(elements, s, instansi="BADAN RISET DAN INOVASI DAERAH (BRIDA)"):
    elements.append(Paragraph("PEMERINTAH KABUPATEN MIMIKA", s['kop_title']))
    elements.append(Paragraph(instansi, s['kop_title']))
    elements.append(Paragraph("Jalan Poros SP 3, Gedung C Lantai 2, Timika - Papua Tengah 99910", s['kop_sub']))
    elements.append(Paragraph("Laman: brida.mimikakab.go.id | Pos-el: brida@pemda.go.id", s['kop_sub']))
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceBefore=2, spaceAfter=8))

# =========================================================================
# 1. DOKUMEN KERANGKA ACUAN KERJA (KAK)
# =========================================================================
def generate_kak():
    filepath = os.path.join(OUTPUT_DIR, "KAK_PROP-2026-0001_Fortifikasi_Sagu_Gabus.pdf")
    doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    s = get_styles()
    el = []

    add_header(el, s)

    el.append(Paragraph("KERANGKA ACUAN KERJA (KAK) / TERMS OF REFERENCE (TOR)", s['doc_title']))
    el.append(Paragraph("PELAKSANAAN PENELITIAN DAN PENGEMBANGAN DAERAH TAHUN ANGGARAN 2026", s['doc_subtitle']))
    el.append(Paragraph("Nomor Register KAK: KAK/BRIDA/2026/001", s['body_center']))
    el.append(Spacer(1, 10))

    meta_data = [
        [Paragraph("Program", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Program Penelitian dan Pengembangan Daerah (1.04.01)", s['table_cell'])],
        [Paragraph("Kegiatan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Penelitian, Pengembangan, dan Pengkajian Peraturan (1.04.01.2.02)", s['table_cell'])],
        [Paragraph("Sub-Kegiatan DPA", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Penyelenggaraan Penelitian dan Pengembangan Bidang Sosial Kependudukan, Kesehatan dan Pangan (1.04.01.2.02.02)", s['table_cell'])],
        [Paragraph("Kode Rekening", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("5.1.02.02.01.0026 (Belanja Jasa Tenaga Ahli Riset Kebijakan Daerah)", s['table_cell'])],
        [Paragraph("Judul Penelitian", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("<b>Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir</b>", s['table_cell'])],
        [Paragraph("Nomor Proposal", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("PROP-2026-0001 (Jalur: Agenda Riset Daerah - Kompetitif)", s['table_cell'])],
        [Paragraph("Pelaksana Riset", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Dr. Ir. Budi Santoso, M.Sc. (Ketua Tim Peneliti - UGM)", s['table_cell'])],
        [Paragraph("Pagu Anggaran Disetujui", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("<b>Rp 145.000.000,- (Seratus Empat Puluh Lima Juta Rupiah)</b>", s['table_cell'])],
        [Paragraph("Waktu Pelaksanaan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("120 (Seratus Dua Puluh) Hari Kalender (Mei 2026 - Agustus 2026)", s['table_cell'])],
        [Paragraph("Lokasi Riset", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Distrik Mimika Timur dan Distrik Agimuga, Kabupaten Mimika", s['table_cell'])],
    ]
    t_meta = Table(meta_data, colWidths=[120, 10, 410])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    el.append(t_meta)
    el.append(Spacer(1, 10))

    sections = [
        ("I. LATAR BELAKANG", 
         "Tingginya prevalensi stunting pada anak balita di wilayah pesisir Kabupaten Mimika membutuhkan intervensi spesifik yang berkelanjutan dan berbasis kearifan lokal. Sagu (Metroxylon sagu) dan Ikan Gabus (Channa striata) melimpah di perairan lokal dan mengandung albumin tinggi serta asam amino esensial yang sangat efektif memulihkan kondisi wasting dan stunting kronis. Riset ini dirancang untuk memformulasikan biskuit dan bubur fortifikasi berbasis pangan lokal sebagai intervensi gizi resmi bagi Posyandu dan Puskesmas."),
        
        ("II. MAKSUD DAN TUJUAN",
         "1. Menghasilkan formula baku pangan fortifikasi balita berbasis tepung sagu dan konsentrat ikan gabus lokal.<br/>"
         "2. Menguji efektivitas intervensi klinis terhadap kenaikan berat badan dan tinggi badan balita stunting di 2 distrik percontohan.<br/>"
         "3. Menyusun Naskah Akademik Rancangan Peraturan Daerah / Peraturan Bupati tentang Intervensi Pangan Lokal Penurunan Stunting Terintegrasi.<br/>"
         "4. Menghasilkan Policy Brief operasional bagi Dinas Kesehatan dan Dinas Ketahanan Pangan Kabupaten Mimika."),

        ("III. RUANG LINGKUP PEKERJAAN",
         "1. Pengambilan sampel biologis, survei baseline gizi keluarga balita di Distrik Mimika Timur dan Agimuga.<br/>"
         "2. Uji laboratorium uji proksimat, kadar protein, albumin, dan daya cerna di laboratorium terakreditasi.<br/>"
         "3. Intervensi pemberian formula pangan lokal selama 60 hari pada 80 balita sasaran.<br/>"
         "4. Uji penerimaan rasa (*organoleptic test*) dan kepatuhan konsumsi keluarga.<br/>"
         "5. FGD lintas sektor bersama Bappeda, Dinas Kesehatan, dan Dinas Pertanian & Ketahanan Pangan.<br/>"
         "6. Penyusunan Naskah Akademik draf regulasi daerah dan laporan ilmiah komprehensif."),

        ("IV. LUARAN WAJIB RISET (DELIVERABLES)",
         "1. <b>Dokumen Laporan Akhir Ilmiah Lengkap</b> (Hardcopy dan Softcopy PDF format baku SIMRIDA).<br/>"
         "2. <b>Naskah Akademik Regulasi Daerah</b> (Draf Peraturan Bupati / Perda Penanganan Stunting Berbasis Pangan Lokal).<br/>"
         "3. <b>Policy Brief Ringkas (2-4 Halaman)</b> untuk konsumsi Kepala Daerah dan Kepala OPD Teknis.<br/>"
         "4. <b>Berita Acara Serah Terima (BAST) dan Hak Kekayaan Intelektual (Paten Formulasi/Hak Cipta)</b>."),

        ("V. TATA CARA PENDANAAN & SISTEM PENYERAPAN KAS",
         "Sesuai ketentuan tata kelola keuangan riset SIMRIDA BRIDA TA 2026, pembayaran bantuan biaya riset ini dilaksanakan dengan sistem <b>1 (satu) tahap pelunasan akhir sebesar 100% (Rp 145.000.000,-)</b> setelah seluruh dokumen luaran riset (Laporan Akhir, Naskah Akademik, dan Policy Brief) diserahkan ke sistem SIMRIDA dan mendapatkan <b>Pengesahan Resmi (Approval) dari Kepala BRIDA Kabupaten Mimika</b>.")
    ]

    for title, desc in sections:
        el.append(Paragraph(title, s['body_bold']))
        el.append(Spacer(1, 2))
        el.append(Paragraph(desc, s['body']))
        el.append(Spacer(1, 6))

    # Tanda Tangan
    el.append(Spacer(1, 10))
    ttd_data = [
        [Paragraph("", s['table_cell']), Paragraph("Timika, 2 Mei 2026<br/><b>PENGGUNA ANGGARAN (PA) / KEPALA BRIDA<br/>KABUPATEN MIMIKA</b>", s['table_cell_center'])],
        [Paragraph("", s['table_cell']), Spacer(1, 35)],
        [Paragraph("", s['table_cell']), Paragraph("<u><b>Drs. H. HENDRA WIJAYA, M.Si.</b></u><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19720815 199803 1 004", s['table_cell_center'])]
    ]
    t_ttd = Table(ttd_data, colWidths=[300, 240])
    t_ttd.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
    ]))
    el.append(t_ttd)

    doc.build(el)
    print("[OK] Berhasil membuat KAK:", filepath)

# =========================================================================
# 2. DOKUMEN ALOKASI ANGGARAN (RKA / DPA)
# =========================================================================
def generate_rka():
    filepath = os.path.join(OUTPUT_DIR, "RKA_DPA_PROP-2026-0001_Belanja_Jasa_Riset.pdf")
    doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    s = get_styles()
    el = []

    add_header(el, s)

    el.append(Paragraph("DOKUMEN PELAKSANAAN ANGGARAN (DPA) / RKA SKPD", s['doc_title']))
    el.append(Paragraph("RINCIAN DOKUMEN ALOKASI ANGGARAN BELANJA RISET DAERAH TA 2026", s['doc_subtitle']))
    el.append(Paragraph("Nomor Dokumen Anggaran: DPA/A.1/1.04.01.2.02.02/001/2026", s['body_center']))
    el.append(Spacer(1, 8))

    meta_rka = [
        [Paragraph("SKPD Pengampu", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Badan Riset dan Inovasi Daerah (BRIDA)", s['table_cell'])],
        [Paragraph("Urusan Pemerintahan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("1 - Urusan Pemerintahan Wajib Non-Pelayanan Dasar", s['table_cell'])],
        [Paragraph("Bidang Urusan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("1.04 - Penelitian dan Pengembangan Daerah", s['table_cell'])],
        [Paragraph("Program", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("1.04.01 - Program Penelitian dan Pengembangan Daerah", s['table_cell'])],
        [Paragraph("Kegiatan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("1.04.01.2.02 - Penelitian, Pengembangan, dan Pengkajian Peraturan", s['table_cell'])],
        [Paragraph("Sub-Kegiatan SIPD", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("<b>1.04.01.2.02.02 - Penyelenggaraan Penelitian dan Pengembangan Bidang Sosial Kependudukan, Kesehatan dan Pangan</b>", s['table_cell'])],
        [Paragraph("Sumber Pendanaan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("APBD Kabupaten Mimika TA 2026 (Pagu Kas Induk Belanja Riset)", s['table_cell'])],
        [Paragraph("Paket Pekerjaan", s['table_cell_bold']), Paragraph(":", s['table_cell']), Paragraph("Penyelenggaraan Riset Stunting Fortifikasi Sagu dan Gabus (PROP-2026-0001)", s['table_cell'])],
    ]
    t_meta = Table(meta_rka, colWidths=[120, 10, 410])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    el.append(t_meta)
    el.append(Spacer(1, 8))

    el.append(Paragraph("<b>TABEL RINCIAN ANGGARAN BIAYA (RAB) DEFINITIF GERBANG 3:</b>", s['table_cell_bold']))
    el.append(Spacer(1, 4))

    rab_rows = [
        [
            Paragraph("<b>Kode Rekening</b>", s['table_cell_bold']),
            Paragraph("<b>Uraian Rincian Belanja</b>", s['table_cell_bold']),
            Paragraph("<b>Volume</b>", s['table_cell_bold']),
            Paragraph("<b>Satuan</b>", s['table_cell_bold']),
            Paragraph("<b>Tarif SBM (Rp)</b>", s['table_cell_bold']),
            Paragraph("<b>Jumlah (Rp)</b>", s['table_cell_bold'])
        ],
        # 1. Honor
        [
            Paragraph("5.1.02.02.01.0026", s['table_cell']),
            Paragraph("<b>Honorarium Tim Tenaga Ahli Riset</b><br/>- Peneliti Utama (Doktor S3) (4 bln x Rp 4.500.000)<br/>- Peneliti Anggota (2 org x 4 bln x Rp 3.000.000)<br/>- Tenaga Pengolah Data Statistik (1 org x Rp 6.000.000)", s['table_cell']),
            Paragraph("4<br/>8<br/>1", s['table_cell_center']),
            Paragraph("OB<br/>OB<br/>Paket", s['table_cell_center']),
            Paragraph("4.500.000<br/>3.000.000<br/>6.000.000", s['table_cell_right']),
            Paragraph("18.000.000<br/>24.000.000<br/>6.000.000", s['table_cell_right'])
        ],
        # 2. Survei & Sampel
        [
            Paragraph("5.1.02.02.01.0026", s['table_cell']),
            Paragraph("<b>Survei Lapangan, Transport & Sampling Pesisir</b><br/>- Sewa Perahu Motor Longboat Timika-Agimuga PP<br/>- Uang Harian & Akomodasi Surveyor Lapangan di Kampung<br/>- Pengadaan Bahan Pangan Sagu Basah & Ikan Gabus Liar", s['table_cell']),
            Paragraph("6<br/>40<br/>1", s['table_cell_center']),
            Paragraph("Trip<br/>OH<br/>Paket", s['table_cell_center']),
            Paragraph("3.500.000<br/>600.000<br/>7.000.000", s['table_cell_right']),
            Paragraph("21.000.000<br/>24.000.000<br/>7.000.000", s['table_cell_right'])
        ],
        # 3. Uji Laboratorium
        [
            Paragraph("5.1.02.02.01.0026", s['table_cell']),
            Paragraph("<b>Analisis Laboratorium Terakreditasi KAN</b><br/>- Uji Proksimat (Kadar Air, Abu, Lemak, Karbohidrat)<br/>- Uji Spektrofotometri Kadar Albumin & Protein Murni<br/>- Uji Cemaran Mikroba & Logam Berat Pangan Balita", s['table_cell']),
            Paragraph("10<br/>10<br/>10", s['table_cell_center']),
            Paragraph("Sampel<br/>Sampel<br/>Sampel", s['table_cell_center']),
            Paragraph("800.000<br/>1.200.000<br/>500.000", s['table_cell_right']),
            Paragraph("8.000.000<br/>12.000.000<br/>5.000.000", s['table_cell_right'])
        ],
        # 4. FGD & Penyusunan NA
        [
            Paragraph("5.1.02.02.01.0026", s['table_cell']),
            Paragraph("<b>FGD Publikasi & Naskah Akademik Regulasi</b><br/>- Konsumsi & Sewa Ruang FGD Bersama Dinkes & Bappeda<br/>- Honor Narasumber Ahli Kebijakan Publik Daerah<br/>- Penggandaan & Penjilidan Naskah Akademik & Policy Brief", s['table_cell']),
            Paragraph("2<br/>4<br/>20", s['table_cell_center']),
            Paragraph("Paket<br/>OJ<br/>Buku", s['table_cell_center']),
            Paragraph("5.000.000<br/>1.500.000<br/>200.000", s['table_cell_right']),
            Paragraph("10.000.000<br/>6.000.000<br/>4.000.000", s['table_cell_right'])
        ],
        # Total
        [
            Paragraph("<b>TOTAL PAGU DEFINITIF DISETUJUI</b>", s['table_cell_bold']),
            Paragraph("<b>Pembebanan Pagu Kas Induk Belanja Riset TA 2026</b>", s['table_cell_bold']),
            Paragraph("-", s['table_cell_center']),
            Paragraph("-", s['table_cell_center']),
            Paragraph("-", s['table_cell_center']),
            Paragraph("<b>Rp 145.000.000</b>", s['table_cell_right'])
        ]
    ]

    t_rab = Table(rab_rows, colWidths=[75, 230, 40, 35, 75, 85])
    t_rab.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e2e8f0')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    el.append(t_rab)
    el.append(Spacer(1, 10))

    # Lembar Pengesahan RKA
    ttd_rka = [
        [
            Paragraph("Mengetahui,<br/><b>Pejabat Penatausahaan Keuangan (PPK) BRIDA</b>", s['table_cell_center']),
            Paragraph("Timika, 2 Mei 2026<br/><b>PENGGUNA ANGGARAN (PA) KEPALA BRIDA</b>", s['table_cell_center'])
        ],
        [Spacer(1, 35), Spacer(1, 35)],
        [
            Paragraph("<u><b>MARKUS KARETH, S.E., M.Si.</b></u><br/>NIP. 19780412 200502 1 003", s['table_cell_center']),
            Paragraph("<u><b>Drs. H. HENDRA WIJAYA, M.Si.</b></u><br/>NIP. 19720815 199803 1 004", s['table_cell_center'])
        ]
    ]
    t_ttd_rka = Table(ttd_rka, colWidths=[270, 270])
    t_ttd_rka.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    el.append(t_ttd_rka)

    doc.build(el)
    print("[OK] Berhasil membuat RKA/DPA:", filepath)

# =========================================================================
# 3. DOKUMEN PERJANJIAN KERJA SAMA (PKS) KONTRAK RISET
# =========================================================================
def generate_pks():
    filepath = os.path.join(OUTPUT_DIR, "Draf_PKS_PROP-2026-0001_Kontrak_Litbang.pdf")
    doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    s = get_styles()
    el = []

    add_header(el, s)

    el.append(Paragraph("SURAT PERJANJIAN KERJA SAMA (PKS)", s['doc_title']))
    el.append(Paragraph("PELAKSANAAN PENELITIAN DAN PENGEMBANGAN DAERAH KABUPATEN MIMIKA", s['doc_subtitle']))
    el.append(Paragraph("Nomor BRIDA: PKS/BRIDA/2026/001 &nbsp;&nbsp;|&nbsp;&nbsp; Nomor UGM: 1042/UN1/LPPM/PKS/2026", s['body_center']))
    el.append(Spacer(1, 8))

    el.append(Paragraph(
        "Pada hari ini, <b>Senin</b> tanggal <b>Empat</b> bulan <b>Mei</b> tahun <b>Dua Ribu Dua Puluh Enam</b> (04-05-2026), bertempat di Kantor Badan Riset dan Inovasi Daerah Kabupaten Mimika, para pihak yang bertandatangan di bawah ini:",
        s['body']
    ))
    el.append(Spacer(1, 4))

    pihak_data = [
        [
            Paragraph("<b>I.</b>", s['table_cell_bold']),
            Paragraph("<b>Drs. H. HENDRA WIJAYA, M.Si.</b>, Jabatan Kepala Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika, bertindak untuk dan atas nama Pemerintah Daerah Kabupaten Mimika yang berkedudukan di Gedung C Lt. 2 Jl. Poros SP 3 Timika, selanjutnya disebut <b>PIHAK KESATU</b>.", s['table_cell'])
        ],
        [
            Paragraph("<b>II.</b>", s['table_cell_bold']),
            Paragraph("<b>Dr. Ir. BUDI SANTOSO, M.Sc.</b>, Jabatan Ketua Tim Peneliti Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Gadjah Mada (UGM), bertindak untuk dan atas nama Tim Peneliti UGM yang berkedudukan di Bulaksumur, D.I. Yogyakarta, selanjutnya disebut <b>PIHAK KEDUA</b>.", s['table_cell'])
        ]
    ]
    t_pihak = Table(pihak_data, colWidths=[20, 520])
    t_pihak.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    el.append(t_pihak)
    el.append(Spacer(1, 6))

    el.append(Paragraph("PIHAK KESATU dan PIHAK KEDUA secara bersama-sama sepakat untuk mengikatkan diri dalam Surat Perjanjian Kerja Sama Penelitian dengan ketentuan sebagai berikut:", s['body']))
    el.append(Spacer(1, 6))

    pasal_list = [
        ("Pasal 1: RUANG LINGKUP PEKERJAAN",
         "PIHAK KESATU memberikan penugasan perikatan riset kepada PIHAK KEDUA dan PIHAK KEDUA menerima penugasan tersebut untuk melaksanakan kegiatan penelitian berjudul: <b>'Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir'</b> (Registrasi Proposal: PROP-2026-0001)."),

        ("Pasal 2: NILAI PERJANJIAN & PEMBEBANAN ANGGARAN",
         "1. Nilai perikatan pelaksanaan penelitian ini disepakati sebesar <b>Rp 145.000.000,- (Seratus Empat Puluh Lima Juta Rupiah)</b> sudah termasuk seluruh kewajiban perpajakan yang berlaku.<br/>"
         "2. Biaya pekerjaan ini dibebankan pada DPA BRIDA Kabupaten Mimika Tahun Anggaran 2026 Sub-Kegiatan <b>1.04.01.2.02.02</b> Kode Rekening Belanja <b>5.1.02.02.01.0026</b>."),

        ("Pasal 3: SISTEM PENYERAPAN KAS & TATA CARA PEMBAYARAN",
         "1. Pembayaran bantuan biaya riset ini dilaksanakan melalui <b>1 (Satu) Tahap Pelunasan Penuh (100%)</b> di akhir masa perikatan.<br/>"
         "2. Pencairan dana kas daerah sebesar Rp 145.000.000,- akan ditransfer langsung ke rekening kas resmi LPPM UGM setelah PIHAK KEDUA mengunggah seluruh dokumen luaran riset dan dinyatakan <b>Lolos Uji Mutu serta Disahkan (Approved) Resmi oleh Kepala BRIDA Kabupaten Mimika</b> melalui sistem SIMRIDA.<br/>"
         "3. Apabila hasil kajian dinilai belum memenuhi standar kelayakan ilmiah oleh Kepala BRIDA, PIHAK KEDUA berkewajiban melakukan perbaikan (revisi) dan pencairan kas induk ditangguhkan."),

        ("Pasal 4: JANGKA WAKTU PELAKSANAAN",
         "Jangka waktu pelaksanaan penelitian ini adalah selama <b>120 (Seratus Dua Puluh) Hari Kalender</b>, terhitung sejak tanggal <b>04 Mei 2026</b> sampai dengan tanggal <b>31 Agustus 2026</b>."),

        ("Pasal 5: HAK KEKAYAAN INTELEKTUAL & REKOMENDASI OPD",
         "1. Naskah Akademik regulasi dan Policy Brief yang dihasilkan menjadi hak milik Pemerintah Daerah Kabupaten Mimika untuk diintegrasikan ke dalam Renja OPD Dinas Kesehatan dan penyusunan Peraturan Kepala Daerah.<br/>"
         "2. Publikasi ilmiah pada jurnal nasional/internasional mencantumkan BRIDA Kabupaten Mimika sebagai penyandang dana (funder).")
    ]

    for title, desc in pasal_list:
        el.append(Paragraph(title, s['body_bold']))
        el.append(Spacer(1, 1.5))
        el.append(Paragraph(desc, s['body']))
        el.append(Spacer(1, 4.5))

    # Tanda Tangan Para Pihak
    el.append(Spacer(1, 8))
    ttd_pks = [
        [
            Paragraph("<b>PIHAK KEDUA</b><br/>Ketua Tim Peneliti LPPM UGM", s['table_cell_center']),
            Paragraph("<b>PIHAK KESATU</b><br/>Kepala BRIDA Kabupaten Mimika", s['table_cell_center'])
        ],
        [
            Paragraph("<br/><br/><i>[Materai Rp 10.000 & Stempel UGM]</i><br/><br/>", s['table_cell_center']),
            Paragraph("<br/><br/><i>[Tanda Tangan & Cap Dinas BRIDA]</i><br/><br/>", s['table_cell_center'])
        ],
        [
            Paragraph("<u><b>Dr. Ir. BUDI SANTOSO, M.Sc.</b></u><br/>NIP. 19750612 200112 1 002", s['table_cell_center']),
            Paragraph("<u><b>Drs. H. HENDRA WIJAYA, M.Si.</b></u><br/>NIP. 19720815 199803 1 004", s['table_cell_center'])
        ]
    ]
    t_ttd_pks = Table(ttd_pks, colWidths=[270, 270])
    t_ttd_pks.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    el.append(t_ttd_pks)

    doc.build(el)
    print("[OK] Berhasil membuat PKS:", filepath)

if __name__ == '__main__':
    generate_kak()
    generate_rka()
    generate_pks()
    print("\n[OK] SEMUA 3 DOKUMEN PERIKATAN LEGAL BERHASIL DIGENERATE DI:", OUTPUT_DIR)
