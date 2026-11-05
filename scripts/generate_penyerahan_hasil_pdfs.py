import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

OUTPUT_DIR = r"D:\Pekerjaan\SIM-RIDA 2\DOKUMEN_PERIKATAN_BRIDA"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_styles():
    styles = getSampleStyleSheet()
    
    kop_title = ParagraphStyle(
        'KopTitle',
        parent=styles['Heading1'],
        fontSize=11,
        leading=13.5,
        textColor=colors.HexColor('#0f172a'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    kop_sub = ParagraphStyle(
        'KopSub',
        parent=styles['Normal'],
        fontSize=8,
        leading=10.5,
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
        textColor=colors.HexColor('#1e40af'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=9.5,
        leading=12.5,
        textColor=colors.HexColor('#0f2942'),
        fontName='Helvetica-Bold'
    )
    body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica'
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body,
        fontName='Helvetica-Bold'
    )
    body_italic = ParagraphStyle(
        'BodyItalic',
        parent=body,
        fontName='Helvetica-Oblique'
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
        'section_title': section_title,
        'body': body,
        'body_bold': body_bold,
        'body_italic': body_italic,
        'body_center': body_center,
        'table_cell': table_cell,
        'table_cell_bold': table_cell_bold,
        'table_cell_center': table_cell_center,
        'table_cell_right': table_cell_right
    }

def create_header(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(45, 11 * 72 - 30, "SIMRIDA v2.0 • Berkas Luaran Hasil Riset Kelitbangan & Rekomendasi Kebijakan BRIDA")
    canvas.drawRightString(8.5 * 72 - 45, 11 * 72 - 30, "Kode Registrasi: PROP-2026-0001")
    canvas.setStrokeColor(colors.HexColor('#cbd5e1'))
    canvas.setLineWidth(0.5)
    canvas.line(45, 11 * 72 - 33, 8.5 * 72 - 45, 11 * 72 - 33)
    canvas.restoreState()

def create_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(45, 25, "Dokumen Luaran Riset Sah Peneliti — Hak Cipta Tim Peneliti & Pemerintah Daerah")
    canvas.drawRightString(8.5 * 72 - 45, 25, f"Halaman {doc.page}")
    canvas.setStrokeColor(colors.HexColor('#cbd5e1'))
    canvas.setLineWidth(0.5)
    canvas.line(45, 33, 8.5 * 72 - 45, 33)
    canvas.restoreState()

# =========================================================================
# 1. LAPORAN AKHIR ILMIAH LENGKAP (PDF)
# =========================================================================
def generate_laporan_akhir():
    filename = "Laporan_Akhir_PROP-2026-0001_Fortifikasi_Sagu_Gabus.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    st = get_styles()
    story = []

    # Kop Lembaga Peneliti & BRIDA
    kop_data = [
        [
            Paragraph(
                "<b>LEMBAGA PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT (LPPM)</b><br/>"
                "<b>UNIVERSITAS GADJAH MADA — YOGYAKARTA</b><br/>"
                "Gedung Pusat UGM Lantai 3, Sayap Selatan, Bulaksumur, D.I. Yogyakarta 55281<br/>"
                "Laman: lppm.ugm.ac.id | Email: penelitian@ugm.ac.id | Telp: (0274) 552432",
                st['kop_title']
            )
        ]
    ]
    t_kop = Table(kop_data, colWidths=[522])
    t_kop.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_kop)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f2942'), spaceAfter=1, spaceBefore=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#0f2942'), spaceAfter=10, spaceBefore=0))

    # Judul Dokumen
    story.append(Paragraph("LAPORAN AKHIR HASIL PENELITIAN KELITBANGAN DAERAH", st['doc_title']))
    story.append(Paragraph("TAHUN ANGGARAN 2026", st['doc_subtitle']))
    story.append(Spacer(1, 4))

    nomor_info = [
        [
            Paragraph("<b>Nomor Dokumen:</b>", st['table_cell_bold']),
            Paragraph("LAP-AKHIR/LITBANG/2026/001", st['table_cell']),
            Paragraph("<b>Tanggal Penyerahan:</b>", st['table_cell_bold']),
            Paragraph("4 November 2026", st['table_cell'])
        ],
        [
            Paragraph("<b>ID Usulan Riset:</b>", st['table_cell_bold']),
            Paragraph("PROP-2026-0001", st['table_cell']),
            Paragraph("<b>Nomor Kontrak PKS:</b>", st['table_cell_bold']),
            Paragraph("PKS/BRIDA/2026/001", st['table_cell'])
        ]
    ]
    t_nomor = Table(nomor_info, colWidths=[100, 160, 110, 152])
    t_nomor.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_nomor)
    story.append(Spacer(1, 10))

    # Ringkasan Eksekutif (Abstrak)
    story.append(Paragraph("<b>I. RINGKASAN EKSEKUTIF & TEMUAN KUNCI HASIL RISET</b>", st['section_title']))
    abstrak_text = (
        "Penelitian terapan ini bertujuan menyelesaikan permasalahan gagal tumbuh (stunting) dan gizi kurang pada balita "
        "di wilayah distrik pesisir melalui inovasi formulasi biskuit Makanan Pendamping Air Susu Ibu (MP-ASI) berbahan baku "
        "lokal tepung sagu (Metroxylon sagu) yang difortifikasi dengan tepung konsentrat protein ikan gabus (Channa striata). "
        "Uji laboratorium biokimia membuktikan formula optimum (F3: proporsi 60% sagu dan 40% konsentrat ikan gabus) menghasilkan "
        "kandungan protein sebesar 14.85 g/100g, albumin 2.45 g/100g, serta seng (Zn) sebesar 4.12 mg/100g yang memenuhi Standar Nasional "
        "Indonesia (SNI 01-7111.1-2005) tentang biskuit MP-ASI. Hasil uji intervensi klinis acak terkontrol selama 90 hari terhadap "
        "120 balita usia 12-36 bulan menunjukkan peningkatan rerata berat badan balita kelompok intervensi sebesar +1.18 kg "
        "(dibandingkan +0.42 kg pada kelompok kontrol) dan penurunan prevalensi balita berstatus wasting sebesar 32.4% (p < 0.001). "
        "Inovasi ini memberikan solusi intervensi gizi berbasis potensi lokal daerah dengan biaya produksi 38% lebih efisien "
        "dibandingkan produk pangan olahan pabrikan komersial."
    )
    story.append(Paragraph(f"<i>{abstrak_text}</i>", st['body']))
    story.append(Spacer(1, 8))

    # Identitas Pelaksana & Anggaran
    story.append(Paragraph("<b>II. IDENTITAS PENELITI & REALISASI ANGGARAN KONTRAK</b>", st['section_title']))
    id_data = [
        [Paragraph("Judul Riset Definitif", st['table_cell_bold']), Paragraph("Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir", st['table_cell'])],
        [Paragraph("Ketua Peneliti", st['table_cell_bold']), Paragraph("Dr. Ir. Budi Santoso, M.Sc. (NIDN: 0012057801)", st['table_cell'])],
        [Paragraph("Institusi / Lembaga", st['table_cell_bold']), Paragraph("Pusat Studi Pangan dan Gizi — Universitas Gadjah Mada (UGM)", st['table_cell'])],
        [Paragraph("Anggota Peneliti", st['table_cell_bold']), Paragraph("1. Dr. Siti Aminah, S.Gz., M.Biomed (Ahli Gizi Masyarakat)<br/>2. Ir. Hendro Wibowo, M.P. (Ahli Teknologi Pengolahan Pangan)", st['table_cell'])],
        [Paragraph("Nilai Kontrak Perikatan", st['table_cell_bold']), Paragraph("Rp 145.000.000,- (Seratus Empat Puluh Lima Juta Rupiah)", st['table_cell_bold'])],
        [Paragraph("Sumber Rekening DPA", st['table_cell_bold']), Paragraph("5.1.02.02.01.0026 — Belanja Jasa Tenaga Ahli Riset / Kajian Kelitbangan BRIDA", st['table_cell'])],
        [Paragraph("Perangkat Daerah Pengampu", st['table_cell_bold']), Paragraph("Dinas Kesehatan dan Dinas Pertanian & Ketahanan Pangan", st['table_cell'])],
    ]
    t_id = Table(id_data, colWidths=[150, 372])
    t_id.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_id)
    story.append(Spacer(1, 8))

    # Temuan Penelitian & Efektivitas Intervensi
    story.append(Paragraph("<b>III. MATRIKS HASIL UJI LABORATORIUM & EFEKTIVITAS KLINIS</b>", st['section_title']))
    hasil_uji = [
        [
            Paragraph("Parameter Uji Mutu", st['table_cell_bold']),
            Paragraph("Standar SNI MP-ASI", st['table_cell_bold']),
            Paragraph("Hasil Formula Kontrol", st['table_cell_bold']),
            Paragraph("Hasil Inovasi (Sagu + Gabus)", st['table_cell_bold']),
            Paragraph("Status / Kesimpulan", st['table_cell_bold'])
        ],
        [
            Paragraph("Kadar Protein Kasar", st['table_cell']),
            Paragraph("Min. 8 - 15 g/100g", st['table_cell_center']),
            Paragraph("7.2 g/100g", st['table_cell_center']),
            Paragraph("<b>14.85 g/100g</b>", st['table_cell_center']),
            Paragraph("Memenuhi Standar Unggul", st['table_cell_bold'])
        ],
        [
            Paragraph("Kandungan Albumin", st['table_cell']),
            Paragraph("Tidak Dipersyaratkan", st['table_cell_center']),
            Paragraph("0.35 g/100g", st['table_cell_center']),
            Paragraph("<b>2.45 g/100g</b>", st['table_cell_center']),
            Paragraph("Kaya Albumin Regeneratif", st['table_cell_bold'])
        ],
        [
            Paragraph("Kadar Seng (Zn) Mikro", st['table_cell']),
            Paragraph("Min. 2.5 mg/100g", st['table_cell_center']),
            Paragraph("1.8 mg/100g", st['table_cell_center']),
            Paragraph("<b>4.12 mg/100g</b>", st['table_cell_center']),
            Paragraph("Sesuai Syarat Imunitas", st['table_cell_bold'])
        ],
        [
            Paragraph("Daya Terima Anak (Organoleptik)", st['table_cell']),
            Paragraph("Min. 70% Penerimaan", st['table_cell_center']),
            Paragraph("65.4% Suka", st['table_cell_center']),
            Paragraph("<b>88.7% Sangat Suka</b>", st['table_cell_center']),
            Paragraph("Tingkat Kesukaan Tinggi", st['table_cell_bold'])
        ],
        [
            Paragraph("Kenaikan BB Rerata (90 Hari)", st['table_cell']),
            Paragraph("Target > 0.8 kg", st['table_cell_center']),
            Paragraph("+0.42 kg / balita", st['table_cell_center']),
            Paragraph("<b>+1.18 kg / balita</b>", st['table_cell_center']),
            Paragraph("Efektif Mengentaskan Wasting", st['table_cell_bold'])
        ]
    ]
    t_uji = Table(hasil_uji, colWidths=[130, 95, 95, 102, 100])
    t_uji.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f2942')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    for r in range(1, len(hasil_uji)):
        hasil_uji[r][0].style.textColor = colors.HexColor('#0f172a')
    story.append(t_uji)
    story.append(Spacer(1, 8))

    # Kesimpulan & Lembar Pengesahan
    story.append(Paragraph("<b>IV. KESIMPULAN RISET & REKOMENDASI MANFAAT DAERAH</b>", st['section_title']))
    kesimpulan_text = (
        "1. Pemanfaatan sagu dan ikan gabus lokal sangat layak secara gizi, diterima dengan baik oleh anak balita pesisir, "
        "dan secara terukur mengatasi defisit mikronutrien pemicu stunting.<br/>"
        "2. Rantai pasok bahan baku melimpah di distrik pesisir sehingga tidak menimbulkan ketergantungan impor pangan.<br/>"
        "3. Berkas draf Peraturan Bupati dan Policy Brief telah disusun terlampir untuk memfasilitasi adopsi regulasi oleh OPD terkait."
    )
    story.append(Paragraph(kesimpulan_text, st['body']))
    story.append(Spacer(1, 12))

    # Blok Tanda Tangan Pengesahan
    ttd_data = [
        [
            Paragraph("Mengetahui,<br/><b>Direktur LPPM Universitas Gadjah Mada</b>", st['table_cell_center']),
            Paragraph("Yogyakarta, 4 November 2026<br/><b>Ketua Tim Peneliti Mandiri</b>", st['table_cell_center'])
        ],
        [
            Spacer(1, 35),
            Spacer(1, 35)
        ],
        [
            Paragraph("<u>Prof. Dr. Ir. Suratman, M.Sc.</u><br/>NIP. 196006121987031002", st['table_cell_center']),
            Paragraph("<u>Dr. Ir. Budi Santoso, M.Sc.</u><br/>NIDN. 0012057801", st['table_cell_center'])
        ]
    ]
    t_ttd = Table(ttd_data, colWidths=[261, 261])
    t_ttd.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(KeepTogether(t_ttd))

    doc.build(story, onFirstPage=create_header, onLaterPages=create_header)
    print(f"[OK] Laporan Akhir Ilmiah: {filepath}")
    return filepath

# =========================================================================
# 2. NASKAH AKADEMIK RAPERBUP INTERVENSI STUNTING (PDF)
# =========================================================================
def generate_naskah_akademik():
    filename = "Naskah_Akademik_PROP-2026-0001_Fortifikasi_Sagu_Gabus.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    st = get_styles()
    story = []

    # Kop Naskah Akademik
    kop_data = [
        [
            Paragraph(
                "<b>PEMERINTAH KABUPATEN — BADAN RISET DAN INOVASI DAERAH (BRIDA)</b><br/>"
                "<b>KELOMPOK KERJA PENYUSUNAN KEBIJAKAN & REGULASI KELITBANGAN DAERAH</b><br/>"
                "Kompleks Perkantoran Pemerintah Daerah Gedung B, Lantai 2 • Telp: (0967) 532114",
                st['kop_title']
            )
        ]
    ]
    t_kop = Table(kop_data, colWidths=[522])
    t_kop.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(t_kop)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f2942'), spaceAfter=1, spaceBefore=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#0f2942'), spaceAfter=10, spaceBefore=0))

    # Judul Dokumen
    story.append(Paragraph("NASKAH AKADEMIK", st['doc_title']))
    story.append(Paragraph(
        "RANCANGAN PERATURAN BUPATI TENTANG STANDARISASI DAN IMPLEMENTASI INTERVENSI "
        "GIZI BALITA BERBASIS PANGAN LOKAL SAGU DAN IKAN GABUS UNTUK PERCEPATAN PENURUNAN STUNTING",
        st['doc_subtitle']
    ))
    story.append(Spacer(1, 6))

    meta_table = [
        [
            Paragraph("<b>Nomor Register NA:</b>", st['table_cell_bold']),
            Paragraph("NA/REGULASI/BRIDA/2026/001", st['table_cell']),
            Paragraph("<b>Target Tahun Realisasi:</b>", st['table_cell_bold']),
            Paragraph("Tahun Anggaran 2027", st['table_cell'])
        ],
        [
            Paragraph("<b>Bentuk Produk Hukum:</b>", st['table_cell_bold']),
            Paragraph("Peraturan Bupati (Perbup)", st['table_cell']),
            Paragraph("<b>Perangkat Daerah Sasaran:</b>", st['table_cell_bold']),
            Paragraph("Dinas Kesehatan & Dinas Ketahanan Pangan", st['table_cell'])
        ]
    ]
    t_meta = Table(meta_table, colWidths=[120, 150, 120, 132])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Bab I Landasan Yuridis & Filosofis
    story.append(Paragraph("<b>BAB I: KAJIAN TEORETIS DAN LANDASAN YURIDIS EMPIRIS</b>", st['section_title']))
    story.append(Paragraph(
        "Pemberian makanan tambahan lokal bagi balita gizi kurang diatur dalam Peraturan Presiden Nomor 72 Tahun 2021 "
        "tentang Percepatan Penurunan Stunting, serta Permenkes Nomor 29 Tahun 2019 tentang Penanggulangan Masalah Gizi Balita. "
        "Namun pada tingkat daerah, belum ada regulasi turunan berupa Peraturan Kepala Daerah yang secara teknis menetapkan "
        "standar komoditas pangan lokal unggulan spesifik daerah (tepung sagu dan ikan gabus) sebagai belanja pengadaan PMT "
        "wajib bagi puskesmas pesisir. Ketiadaan payung hukum ini menyebabkan alokasi dana BOK dan DAU kesehatan seringkali "
        "tersedot untuk pengadaan produk pabrikan biskuit dari luar pulau yang memicu tingginya biaya logistik dan lambatnya distribusi.",
        st['body']
    ))
    story.append(Spacer(1, 8))

    # Bab II Jangkauan Pengaturan Raperbup
    story.append(Paragraph("<b>BAB II: JANGKAUAN DAN ARAH PENGATURAN RANCANGAN REGULASI</b>", st['section_title']))
    story.append(Paragraph(
        "Rancangan Peraturan Bupati ini mencakup 5 (lima) pilar materi muatan utama:",
        st['body']
    ))
    
    pilar_data = [
        [Paragraph("Pilar Muatan", st['table_cell_bold']), Paragraph("Uraian Substansi Regulasi", st['table_cell_bold']), Paragraph("Instansi Pelaksana", st['table_cell_bold'])],
        [
            Paragraph("1. Standar Gizi PMT Lokal", st['table_cell_bold']),
            Paragraph("Penetapan formulasi baku biskuit MP-ASI: kadar protein minimal 14g/100g berbahan sagu dan ikan gabus higienis.", st['table_cell']),
            Paragraph("Dinas Kesehatan & BPOM", st['table_cell'])
        ],
        [
            Paragraph("2. Kewajiban Rantai Pasok", st['table_cell_bold']),
            Paragraph("Penetapan Poktan/Kelompok Nelayan lokal sebagai pemasok resmi komoditas sagu dan ikan gabus dengan harga patokan daerah.", st['table_cell']),
            Paragraph("Dinas Ketahanan Pangan & Dinas Perikanan", st['table_cell'])
        ],
        [
            Paragraph("3. Jalur Distribusi Posyandu", st['table_cell_bold']),
            Paragraph("Integrasi penyaluran makanan tambahan melalui penimbangan bulanan Posyandu dan pendampingan kader desa terpadu.", st['table_cell']),
            Paragraph("Puskesmas & Posyandu se-Distrik", st['table_cell'])
        ],
        [
            Paragraph("4. Alokasi Pendanaan APBD", st['table_cell_bold']),
            Paragraph("Penyediaan pos belanja barang/jasa PMT pangan lokal minimal 15% dari total belanja intervensi stunting pada Renja Dinkes.", st['table_cell']),
            Paragraph("Bappeda & BPKAD", st['table_cell'])
        ]
    ]
    t_pilar = Table(pilar_data, colWidths=[120, 270, 132])
    t_pilar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f2942')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    for r in range(1, len(pilar_data)):
        pilar_data[r][0].style.textColor = colors.HexColor('#0f172a')
    story.append(t_pilar)
    story.append(Spacer(1, 8))

    # Bab III Draf Pasal Kunci
    story.append(Paragraph("<b>BAB III: RANCANGAN BATANG TUBUH PERATURAN BUPATI (DRAF PASAL KUNCI)</b>", st['section_title']))
    pasal_text = (
        "<b>Pasal 4:</b> (1) Setiap Puskesmas di wilayah distrik lokus stunting wajib mengutamakan pengadaan Makanan Pendamping "
        "Air Susu Ibu (MP-ASI) berbasis fortifikasi pangan lokal sagu dan konsentrat ikan gabus.<br/>"
        "(2) Formulasi biskuit sebagaimana dimaksud pada ayat (1) wajib merujuk pada standar hasil riset Badan Riset dan Inovasi Daerah.<br/>"
        "<b>Pasal 8:</b> Pendanaan penyelenggaraan intervensi gizi berbasis pangan lokal bersumber dari Anggaran Pendapatan dan Belanja "
        "Daerah (APBD), Dana Alokasi Khusus (DAK) Non-Fisik Bidang Kesehatan, serta sumber pendanaan lain yang sah dan tidak mengikat."
    )
    story.append(Paragraph(pasal_text, st['body']))
    story.append(Spacer(1, 14))

    # Lembar Penandatanganan Naskah Akademik
    na_ttd = [
        [
            Paragraph("Disusun Oleh:<br/><b>Ketua Tim Peneliti & Perumus Regulasi</b>", st['table_cell_center']),
            Paragraph("Diverifikasi untuk Penerbitan Regulasi:<br/><b>Kepala Bidang Kebijakan Pembangunan BRIDA</b>", st['table_cell_center'])
        ],
        [
            Spacer(1, 35),
            Spacer(1, 35)
        ],
        [
            Paragraph("<u>Dr. Ir. Budi Santoso, M.Sc.</u><br/>Koordinator Tim Ahli Litbang", st['table_cell_center']),
            Paragraph("<u>Drs. Paulus Rumabar, M.Si.</u><br/>NIP. 197403151999031003", st['table_cell_center'])
        ]
    ]
    t_na_ttd = Table(na_ttd, colWidths=[261, 261])
    t_na_ttd.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(KeepTogether(t_na_ttd))

    doc.build(story, onFirstPage=create_header, onLaterPages=create_header)
    print(f"[OK] Naskah Akademik: {filepath}")
    return filepath

# =========================================================================
# 3. POLICY BRIEF RINGKAS EKSEKUTIF UNTUK DISPOSISI OPD (PDF)
# =========================================================================
def generate_policy_brief():
    filename = "Policy_Brief_PROP-2026-0001_Fortifikasi_Sagu_Gabus.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    st = get_styles()
    story = []

    # Banner Header Policy Brief
    header_box = [
        [
            Paragraph(
                "<font color='#93c5fd'><b>RINGKASAN KEBIJAKAN EKSEKUTIF (POLICY BRIEF) • BRIDA SERI #01/2026</b></font><br/>"
                "<font size=12 color='#ffffff'><b>MANDIRI PANGAN, BEBAS STUNTING: OPTIMALISASI FORTIFIKASI SAGU DAN IKAN GABUS DI WILAYAH PESISIR</b></font><br/>"
                "<font size=8 color='#cbd5e1'>Rekomendasi Strategis Berbasis Bukti Ilmiah untuk Dinas Kesehatan, Bappeda, dan Dinas Ketahanan Pangan</font>",
                st['kop_title']
            )
        ]
    ]
    t_head = Table(header_box, colWidths=[532])
    t_head.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0f2942')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_head)
    story.append(Spacer(1, 10))

    # Callout Masalah & Fakta Kunci
    callout_data = [
        [
            Paragraph(
                "<b>RINGKASAN ISU KRUSIAL (THE CORE CHALLENGE):</b><br/>"
                "Tingkat prevalensi balita stunting dan wasting di distrik pesisir mencapai 28.4% (jauh di atas target nasional 14%). "
                "Selama ini ketergantungan pada biskuit PMT pabrikan luar daerah membebani APBD dengan ongkos logistik tinggi dan "
                "sering terlambat tiba di posyandu kepulauan. Di sisi lain, potensi lokal sagu dan ikan gabus sangat melimpah namun "
                "belum dimanfaatkan secara sistematis dalam program dinas.",
                st['body']
            )
        ]
    ]
    t_callout = Table(callout_data, colWidths=[532])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#3b82f6')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 10))

    # 3 Temuan Berbasis Bukti Ilmiah
    story.append(Paragraph("<b>BUKTI KUNCI RISET TERAPAN (THE SCIENTIFIC EVIDENCE)</b>", st['section_title']))
    evidence_table = [
        [
            Paragraph("<b>Uji Efikasi Klinis 90 Hari</b>", st['table_cell_bold']),
            Paragraph("<b>Keunggulan Nilai Nutrisi</b>", st['table_cell_bold']),
            Paragraph("<b>Efisiensi Anggaran Daerah</b>", st['table_cell_bold'])
        ],
        [
            Paragraph("Intervensi biskuit sagu-gabus pada 120 balita kurus menghasilkan kenaikan BB +1.18 kg dan menurunkan wasting sebesar <b>32.4%</b>.", st['table_cell']),
            Paragraph("Protein <b>14.85%</b>, Albumin <b>2.45 g/100g</b>, dan Seng <b>4.12 mg/100g</b>; mempercepat pemulihan nafsu makan dan daya imun balita.", st['table_cell']),
            Paragraph("Biaya pengadaan Rp 18.500/kemasan per balita/minggu, menghemat <b>38.2%</b> dibanding pengadaan biskuit komersial impor pulau.", st['table_cell'])
        ]
    ]
    t_ev = Table(evidence_table, colWidths=[177, 177, 178])
    t_ev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_ev)
    story.append(Spacer(1, 10))

    # 3 Rekomendasi Aplikatif Tindak Lanjut OPD
    story.append(Paragraph("<b>REKOMENDASI AKSI DEFINITIF BAGI PERANGKAT DAERAH (OPD) SASARAN</b>", st['section_title']))
    opd_actions = [
        [
            Paragraph("Perangkat Daerah", st['table_cell_bold']),
            Paragraph("Tindakan Strategis yang Diinstruksikan", st['table_cell_bold']),
            Paragraph("Output / Target Waktu", st['table_cell_bold'])
        ],
        [
            Paragraph("<b>Dinas Kesehatan</b>", st['table_cell_bold']),
            Paragraph("Mengadopsi formula biskuit sagu-gabus ke dalam menu intervensi gizi wajib puskesmas serta menyusun SOP distribusi PMT lokal terpadu.", st['table_cell']),
            Paragraph("SOP Dinas & Menu PMT (Triwulan I 2027)", st['table_cell'])
        ],
        [
            Paragraph("<b>Dinas Pertanian & Ketahanan Pangan</b>", st['table_cell_bold']),
            Paragraph("Membina kelompok pengolah sagu dan nelayan penangkap ikan gabus distrik untuk standarisasi higienitas bahan baku tepung.", st['table_cell']),
            Paragraph("Sertifikasi Higienitas 5 Poktan (Triwulan II 2027)", st['table_cell'])
        ],
        [
            Paragraph("<b>Bappeda Kabupaten</b>", st['table_cell_bold']),
            Paragraph("Memasukkan nomenklatur sub-kegiatan Pengadaan PMT Pangan Lokal ke dalam Dokumen RKPD dan KUA-PPAS TA 2027.", st['table_cell']),
            Paragraph("Alokasi RKPD TA 2027 (KUA-PPAS 2027)", st['table_cell'])
        ]
    ]
    t_opd = Table(opd_actions, colWidths=[120, 260, 152])
    t_opd.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f2942')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    for r in range(1, len(opd_actions)):
        opd_actions[r][0].style.textColor = colors.HexColor('#0f172a')
    story.append(t_opd)
    story.append(Spacer(1, 14))

    # Kontak Narahubung & Tim Riset
    kontak_box = [
        [
            Paragraph(
                "<b>Narahubung Peneliti & Sekretariat BRIDA:</b><br/>"
                "• Koordinator Riset: <b>Dr. Ir. Budi Santoso, M.Sc.</b> (Email: budi.santoso@ugm.ac.id / WA: 0812-3456-7890)<br/>"
                "• Tim Disposisi & Kebijakan Kelitbangan: <b>Sekretariat BRIDA Kabupaten</b> (Layanan Riset Daerah)",
                st['body']
            )
        ]
    ]
    t_kontak = Table(kontak_box, colWidths=[532])
    t_kontak.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether(t_kontak))

    doc.build(story, onFirstPage=create_header, onLaterPages=create_header)
    print(f"[OK] Policy Brief: {filepath}")
    return filepath

if __name__ == "__main__":
    print("Membuat 3 berkas luaran resmi penyerahan hasil riset...")
    generate_laporan_akhir()
    generate_naskah_akademik()
    generate_policy_brief()
    print("Semua berkas luaran hasil riset berhasil dibuat di:", OUTPUT_DIR)

