import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'proposals')
os.makedirs(UPLOADS_DIR, exist_ok=True)

def create_doc(filename):
    filepath = os.path.join(UPLOADS_DIR, filename)
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    return doc, filepath

def get_custom_styles():
    styles = getSampleStyleSheet()
    
    header_univ = ParagraphStyle(
        'HeaderUniv',
        parent=styles['Heading1'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        fontName='Helvetica-Bold'
    )
    header_sub = ParagraphStyle(
        'HeaderSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        fontName='Helvetica'
    )
    doc_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold',
        spaceAfter=4
    )
    body = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
        alignment=4, # Justify
        fontName='Helvetica'
    )
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        fontName='Helvetica-Bold'
    )
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica'
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica'
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold'
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=1
    )
    return {
        'header_univ': header_univ,
        'header_sub': header_sub,
        'doc_title': doc_title,
        'section_h1': section_h1,
        'body': body,
        'meta_label': meta_label,
        'meta_val': meta_val,
        'table_cell': table_cell,
        'table_cell_bold': table_cell_bold,
        'table_header': table_header
    }

def format_rp(val):
    return f"Rp {val:,.0f}".replace(",", ".")

# ==============================================================================
# 1. GENERATOR NASKAH PROPOSAL ILMIAH RESMI
# ==============================================================================
def generate_proposal_pdf(filename, prop_num, title, researcher, institution, focus, location, duration, budget, intro_text, method_text, impact_text):
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    # Kop Institusi
    story.append(Paragraph(institution.upper(), styles['header_univ']))
    story.append(Paragraph("LEMBAGA PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT (LPPM)", styles['header_sub']))
    story.append(Paragraph("Pusat Studi Pembangunan Daerah & Kebijakan Publik Terapan", styles['header_sub']))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=12))

    # Judul Dokumen
    story.append(Paragraph("PROPOSAL PENELITIAN ILMIAH DAERAH TAHUN ANGGARAN 2026", styles['doc_title']))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Nomor Registrasi Sistem: <b>{prop_num}</b>", styles['header_sub']))
    story.append(Spacer(1, 10))

    # Identitas Proposal Table
    meta_data = [
        [Paragraph("Judul Penelitian", styles['meta_label']), Paragraph(f": <b>{title}</b>", styles['meta_val'])],
        [Paragraph("Ketua Peneliti", styles['meta_label']), Paragraph(f": {researcher}", styles['meta_val'])],
        [Paragraph("Institusi Pengusul", styles['meta_label']), Paragraph(f": {institution}", styles['meta_val'])],
        [Paragraph("Bidang Kajian", styles['meta_label']), Paragraph(f": {focus}", styles['meta_val'])],
        [Paragraph("Lokus Penelitian", styles['meta_label']), Paragraph(f": {location}", styles['meta_val'])],
        [Paragraph("Durasi & Anggaran", styles['meta_label']), Paragraph(f": {duration} Bulan | Alokasi Usulan: <b>{format_rp(budget)}</b>", styles['meta_val'])],
    ]
    t_meta = Table(meta_data, colWidths=[120, 400])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 12))

    # Bab I Pendahuluan
    story.append(Paragraph("BAB I. PENDAHULUAN & LATAR BELAKANG URGENSI", styles['section_h1']))
    story.append(Paragraph(intro_text, styles['body']))
    story.append(Spacer(1, 10))

    # Bab II Metodologi
    story.append(Paragraph("BAB II. METODOLOGI & TAHAPAN PELAKSANAAN RISET", styles['section_h1']))
    story.append(Paragraph(method_text, styles['body']))
    story.append(Spacer(1, 10))

    # Bab III Manfaat & Target Luaran
    story.append(Paragraph("BAB III. RENCANA TARGET LUARAN & DAMPAK KEBIJAKAN DAERAH", styles['section_h1']))
    story.append(Paragraph(impact_text, styles['body']))
    story.append(Spacer(1, 14))

    # Tanda Tangan
    sign_data = [
        [Paragraph("Mengetahui,<br/>Ketua Lembaga Riset / LPPM", styles['meta_label']), Paragraph("Peneliti Pengusul,<br/>Ketua Tim Riset", styles['meta_label'])],
        [Spacer(1, 24), Spacer(1, 24)],
        [Paragraph(f"( Direktur LPPM {institution} )", styles['meta_val']), Paragraph(f"<b>( {researcher} )</b>", styles['meta_val'])],
    ]
    t_sign = Table(sign_data, colWidths=[260, 260])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_sign)

    doc.build(story)
    print(f"[OK] Proposal PDF generated: {filename}")
    return filepath

# ==============================================================================
# 2. GENERATOR RINCIAN ANGGARAN BIAYA (RAB) RESMI
# ==============================================================================
def generate_rab_pdf(filename, prop_num, title, researcher, budget, items):
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    story.append(Paragraph("RINCIAN ANGGARAN BIAYA (RAB) PENELITIAN", styles['doc_title']))
    story.append(Paragraph("STANDAR BIAYA MASUKAN (SBM) PEMERINTAH DAERAH TAHUN ANGGARAN 2026", styles['header_sub']))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=10))

    meta_data = [
        [Paragraph("Nomor Proposal", styles['meta_label']), Paragraph(f": {prop_num}", styles['meta_val'])],
        [Paragraph("Judul Kajian", styles['meta_label']), Paragraph(f": {title}", styles['meta_val'])],
        [Paragraph("Ketua Peneliti", styles['meta_label']), Paragraph(f": {researcher}", styles['meta_val'])],
        [Paragraph("Total Anggaran", styles['meta_label']), Paragraph(f": <b>{format_rp(budget)}</b>", styles['meta_val'])],
    ]
    t_meta = Table(meta_data, colWidths=[120, 400])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Table Item
    table_data = [
        [
            Paragraph("No", styles['table_header']),
            Paragraph("Uraian Pos Belanja & Komponen Biaya", styles['table_header']),
            Paragraph("Vol", styles['table_header']),
            Paragraph("Satuan", styles['table_header']),
            Paragraph("Standar Biaya SBM (Rp)", styles['table_header']),
            Paragraph("Jumlah Biaya (Rp)", styles['table_header'])
        ]
    ]

    calc_total = 0
    for idx, item in enumerate(items, 1):
        uraian, vol, sat, unit_cost, total_cost = item
        calc_total += total_cost
        table_data.append([
            Paragraph(str(idx), styles['table_cell']),
            Paragraph(uraian, styles['table_cell']),
            Paragraph(str(vol), styles['table_cell']),
            Paragraph(sat, styles['table_cell']),
            Paragraph(f"{unit_cost:,.0f}".replace(",", "."), styles['table_cell']),
            Paragraph(f"{total_cost:,.0f}".replace(",", "."), styles['table_cell_bold'])
        ])

    # Baris Total Anggaran
    table_data.append([
        Paragraph("", styles['table_cell_bold']),
        Paragraph("<b>TOTAL ANGGARAN:</b>", styles['table_cell_bold']),
        Paragraph("", styles['table_cell_bold']),
        Paragraph("", styles['table_cell_bold']),
        Paragraph("", styles['table_cell_bold']),
        Paragraph(f"<b>{format_rp(calc_total)}</b>", styles['table_cell_bold'])
    ])

    t_items = Table(table_data, colWidths=[24, 230, 30, 50, 95, 95])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (2,1), (3,-1), 'CENTER'),
        ('ALIGN', (4,1), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 10))

    catatan = (
        "Catatan Kepatuhan Penganggaran SBM Daerah:<br/>"
        "1. Seluruh standar satuan honorarium, uang harian survei lapangan, dan konsumsi merujuk pada Standar Biaya Masukan (SBM) Daerah Tahun Anggaran 2026.<br/>"
        "2. Seluruh alokasi pembiayaan adalah belanja bahan habis pakai, jasa pengujian laboratorium, dan operasional non-kapital sesuai regulasi riset swakelola daerah."
    )
    story.append(Paragraph(catatan, styles['meta_val']))
    story.append(Spacer(1, 14))

    sign_data = [
        [Paragraph("Disetujui oleh Peneliti Pengusul,", styles['meta_label'])],
        [Spacer(1, 24)],
        [Paragraph(f"<b>( {researcher} )</b><br/>Ketua Pelaksana Riset", styles['meta_val'])],
    ]
    t_sign = Table(sign_data, colWidths=[260])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(t_sign)

    doc.build(story)
    print(f"[OK] RAB PDF generated: {filename} (Total: {calc_total:,})")
    return filepath

# ==============================================================================
# 3. GENERATOR SURAT PENGANTAR DEKANAT / LEMBAGA RESMI
# ==============================================================================
def generate_cover_letter_pdf(filename, institution, ref_no, date_str, dean_name, dean_nip, researcher_name, proposal_title):
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    story.append(Paragraph(institution.upper(), styles['header_univ']))
    story.append(Paragraph("FAKULTAS DAN LEMBAGA PENELITIAN / DEKANAT", styles['header_sub']))
    story.append(Paragraph("Jalan Kampus Pusat Pendidikan dan Sains Riset Terapan", styles['header_sub']))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=14))

    meta_letter = [
        [Paragraph("Nomor", styles['meta_label']), Paragraph(f": {ref_no}", styles['meta_val']), Paragraph(f"Tanggal: {date_str}", styles['meta_val'])],
        [Paragraph("Lampiran", styles['meta_label']), Paragraph(": 1 (Satu) Berkas Lengkap Proposal & RAB", styles['meta_val']), Paragraph("", styles['meta_val'])],
        [Paragraph("Perihal", styles['meta_label']), Paragraph(": <b>Surat Pengantar Usulan Penelitian Daerah Tahun 2026</b>", styles['meta_val']), Paragraph("", styles['meta_val'])],
    ]
    t_letter = Table(meta_letter, colWidths=[70, 320, 130])
    t_letter.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_letter)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Kepada Yth.<br/><b>Kepala Badan Riset dan Inovasi Daerah (BRIDA)</b><br/>Pemerintah Daerah", styles['body']))
    story.append(Spacer(1, 10))

    body_text = (
        f"Dengan hormat,<br/><br/>"
        f"Sehubungan dengan pelaksanaan program riset dan inovasi daerah tahun anggaran 2026, bersama surat ini pimpinan "
        f"{institution} menyampaikan usulan proposal penelitian resmi dengan data periset sebagai berikut:<br/><br/>"
        f"<b>Nama Ketua Peneliti</b> : {researcher_name}<br/>"
        f"<b>Institusi Pengusul</b> : {institution}<br/>"
        f"<b>Judul Penelitian</b> : <i>\"{proposal_title}\"</i><br/><br/>"
        f"Pihak institusi dan dekanat telah melakukan review administratif internal dan menyatakan bahwa tim peneliti yang bersangkutan "
        f"memiliki kompetensi akademik yang memadai serta kualifikasi yang sah untuk melaksanakan penelitian tersebut secara tuntas "
        f"sesuai kaidah ilmiah dan regulasi pemerintah daerah.<br/><br/>"
        f"Demikian surat pengantar ini kami terbitkan secara resmi dengan penuh tanggung jawab untuk dapat diproses lebih lanjut "
        f"pada tahapan seleksi Gerbang Administrasi BRIDA. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih."
    )
    story.append(Paragraph(body_text, styles['body']))
    story.append(Spacer(1, 20))

    sign_data = [
        [Spacer(1, 10), Paragraph("Pimpinan Institusi / Dekan Fakultas,", styles['meta_label'])],
        [Spacer(1, 30), Spacer(1, 30)],
        [Spacer(1, 10), Paragraph(f"<b><u>{dean_name}</u></b><br/>NIP. {dean_nip}", styles['meta_val'])],
    ]
    t_sign = Table(sign_data, colWidths=[280, 240])
    story.append(t_sign)

    doc.build(story)
    print(f"[OK] Cover Letter PDF generated: {filename}")
    return filepath

# ==============================================================================
# 4. GENERATOR PAKTA INTEGRITAS RESMI BERMATERAI
# ==============================================================================
def generate_integrity_pact_pdf(filename, researcher_name, nidn_nip, institution, address, proposal_title):
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    story.append(Paragraph("SURAT PERNYATAAN PAKTA INTEGRITAS", styles['doc_title']))
    story.append(Paragraph("DAN PERNYATAAN BEBAS PLAGIASI PENELITIAN DAERAH", styles['header_univ']))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=14))

    story.append(Paragraph("Yang bertanda tangan di bawah ini:", styles['body']))
    story.append(Spacer(1, 8))

    ident_data = [
        [Paragraph("Nama Lengkap", styles['meta_label']), Paragraph(f": <b>{researcher_name}</b>", styles['meta_val'])],
        [Paragraph("NIDN / NIP", styles['meta_label']), Paragraph(f": {nidn_nip}", styles['meta_val'])],
        [Paragraph("Jabatan / Peran", styles['meta_label']), Paragraph(": Ketua Tim Peneliti Pengusul", styles['meta_val'])],
        [Paragraph("Institusi Pengusul", styles['meta_label']), Paragraph(f": {institution}", styles['meta_val'])],
        [Paragraph("Alamat Lembaga", styles['meta_label']), Paragraph(f": {address}", styles['meta_val'])],
        [Paragraph("Judul Usulan Riset", styles['meta_label']), Paragraph(f": <i>\"{proposal_title}\"</i>", styles['meta_val'])],
    ]
    t_ident = Table(ident_data, colWidths=[120, 400])
    t_ident.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ident)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Menyatakan dengan sesungguhnya dan berani bersumpah bahwa:", styles['body']))
    story.append(Spacer(1, 6))

    points = (
        "1. Usulan proposal riset yang kami ajukan bersifat <b>ORISINIL</b>, merupakan hasil pemikiran tim peneliti, "
        "serta <b>BEBAS DARI SEGALA UNSUR PLAGIASI / FABRIKASI DATA</b> sesuai ketentuan perundang-undangan etika penelitian ilmiah.<br/>"
        "2. Usulan kegiatan riset ini <b>TIDAK SEDANG DAN TIDAK AKAN DIDANAI SECARA GANDA (DOUBLE FUNDING)</b> dari sumber pendanaan "
        "APBD Kabupaten/Kota/Provinsi lain, APBN Kementerian, LPDP, maupun hibah donor pihak ketiga manapun pada tahun berjalan.<br/>"
        "3. Seluruh dokumen rincian anggaran biaya (RAB), profil tim pelaksana, dan metodologi yang diunggah dalam sistem adalah benar "
        "dan dapat dipertanggungjawabkan keabsahan yuridis dan materialnya.<br/>"
        "4. Apabila di kemudian hari ditemukan bukti ketidakbenaran pernyataan ini atau terindikasi pelanggaran etik plagiasi, "
        "maka kami bersedia menerima sanksi pembatalan usulan, pemutusan kontrak riset sepihak, pengembalian seluruh dana ke Kas Daerah, "
        "dan diproses sesuai ketentuan hukum yang berlaku di Negara Kesatuan Republik Indonesia."
    )
    story.append(Paragraph(points, styles['body']))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Demikian pakta integritas ini dibuat dan ditandatangani dengan kesadaran penuh tanpa paksaan dari pihak manapun.", styles['body']))
    story.append(Spacer(1, 16))

    sign_data = [
        [
            Paragraph("Mengetahui,<br/>Dekan / Pimpinan Institusi", styles['meta_label']),
            Paragraph("Dibuat pada: 15 Januari 2026<br/>Ketua Tim Peneliti Pengusul,", styles['meta_label'])
        ],
        [
            Spacer(1, 35),
            Paragraph("<i>[ MATERAI TEMPEL ]<br/>Rp 10.000,-<br/>Sah Bertanda Tangan</i>", styles['header_sub'])
        ],
        [
            Paragraph("( Pimpinan Fakultas / LPPM )", styles['meta_val']),
            Paragraph(f"<b><u>{researcher_name}</u></b><br/>NIDN/NIP: {nidn_nip}", styles['meta_val'])
        ],
    ]
    t_sign = Table(sign_data, colWidths=[260, 260])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_sign)

    doc.build(story)
    print(f"[OK] Integrity Pact PDF generated: {filename}")
    return filepath

# ==============================================================================
# 5. GENERATOR DOKUMEN DEFECTIVE / CACAT UNTUK TESTING GAGAL GERBANG 1
# ==============================================================================
def generate_dummy_text_rab(filename, title, researcher):
    """RAB yang sama sekali TIDAK MEMILIKI ANGKA/TABEL BIAYA (Triggers NO_NUMERICAL_BREAKDOWN)"""
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    story.append(Paragraph("RENCANA ANGGARAN BIAYA PENELITIAN (DRAFT AWAL)", styles['doc_title']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Judul Usulan: {title}", styles['meta_label']))
    story.append(Paragraph(f"Ketua Tim: {researcher}", styles['meta_label']))
    story.append(Spacer(1, 12))

    dummy_narasi = (
        "Dokumen ini memuat deskripsi garis besar rencana kebutuhan pengeluaran biaya penelitian di lapangan. "
        "Anggaran akan dialokasikan untuk pembiayaan kegiatan survei awal, wawancara informan kunci, "
        "penggandaan kuesioner instrumen penelitian, serta rapat koordinasi dengan dinas terkait di daerah. "
        "Rincian item pembiayaan secara terperinci beserta besaran tarif nominal satuan masih dalam proses penyesuaian "
        "dan perhitungan lebih lanjut oleh bendahara tim peneliti sehingga belum dapat ditampilkan dalam lembar ini. "
        "Seluruh estimasi pembiayaan secara umum diusulkan untuk mendukung kelancaran operasional penelitian."
    )
    story.append(Paragraph(dummy_narasi, styles['body']))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Tertanda Tim Peneliti Pengusul.", styles['body']))

    doc.build(story)
    print(f"[OK] Dummy No-Numbers RAB generated: {filename}")
    return filepath

def generate_prohibited_rab(filename, prop_num, title, researcher, budget):
    """RAB dengan BELANJA MODAL TERLARANG (Laptop MacBook Pro, iPhone, Kamera) & SELISIH NOMINAL"""
    # Form budget 82jt, tapi RAB total 78jt (selisih) dan ada pos terlarang
    items = [
        ("Pengadaan 1 Unit Laptop MacBook Pro M3 untuk Pengolahan Citra Digital", 1, "Unit", 28000000, 28000000),
        ("Pengadaan Smartphone iPhone 15 Pro Max untuk Dokumentasi Lapangan", 1, "Unit", 20000000, 20000000),
        ("Pengadaan Kamera DSLR Nikon D7500 untuk Dokumentasi Kebun", 1, "Unit", 18000000, 18000000),
        ("Transport Lokal dan Akomodasi Tim Lapangan", 1, "Paket", 12000000, 12000000),
    ]
    # Total = 78.000.000 (Form input: 82.000.000)
    return generate_rab_pdf(filename, prop_num, title, researcher, budget, items)

def generate_dummy_proposal_bodong(filename):
    """Naskah Proposal Dummy Singkat (32 kata, 0 kata kunci judul)"""
    doc, filepath = create_doc(filename)
    styles = get_custom_styles()
    story = []

    story.append(Paragraph("DRAFT RINGKASAN PENELITIAN UMUM", styles['doc_title']))
    story.append(Spacer(1, 10))
    dummy_text = (
        "Ini adalah naskah pengajuan sementara yang diunggah oleh asisten mahasiswa guna melengkapi persyaratan upload berkas portal. "
        "Dokumen naskah lengkap proposal final sedang dalam tahap penyusunan dan peninjauan internal tim pembimbing kampus. "
        "Mohon konfirmasi jika ada berkas yang kurang."
    )
    story.append(Paragraph(dummy_text, styles['body']))
    doc.build(story)
    print(f"[OK] Bodong Proposal generated: {filename}")
    return filepath

print("ReportLab PDF Helper loaded.")

# ==============================================================================
# MAIN BATCH GENERATION
# ==============================================================================
def main():
    print("=== START GENERATING REALISTIC TEST PDF DOCUMENTS ===")

    # 1. Dokumen Lembaga & Surat Pengantar Standar
    generate_cover_letter_pdf(
        "surat_pengantar_resmi_ugm.pdf",
        "Universitas Gadjah Mada",
        "0412/UN1/LPPM/TU/2026",
        "12 Januari 2026",
        "Prof. Ir. Sugeng Priyanto, M.Sc., Ph.D.",
        "196805141993031002",
        "Dr. Ir. Budi Santoso, M.Sc.",
        "Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir"
    )
    generate_cover_letter_pdf(
        "surat_pengantar_resmi_itb.pdf",
        "Institut Teknologi Bandung",
        "0288/ITB/LPPM/RST/2026",
        "14 Januari 2026",
        "Prof. Dr. Ir. Bambang Riyanto, M.T.",
        "196508211990021001",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        "Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting"
    )
    generate_cover_letter_pdf(
        "surat_pengantar_resmi_ipb.pdf",
        "Institut Pertanian Bogor",
        "0195/IPB/DRI/KP/2026",
        "10 Januari 2026",
        "Prof. Dr. Ir. Dodik Ridho Nurrochmat, M.Sc.F.",
        "197003151994031003",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        "Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting"
    )
    generate_cover_letter_pdf(
        "surat_pengantar_resmi_unipa.pdf",
        "Universitas Papua",
        "0355/UNIPA/LPPM/KP/2026",
        "16 Januari 2026",
        "Dr. Ir. Zulfikar Rumatora, M.Si.",
        "197211041998031004",
        "Prof. Dr. Frans Mayor, M.Si.",
        "Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini"
    )
    generate_cover_letter_pdf(
        "surat_pengantar_resmi_uncen.pdf",
        "Universitas Cenderawasih",
        "0521/UNCEN/LPPM/PL/2026",
        "15 Januari 2026",
        "Dr. Yohanis Rumpaidus, S.Sos., M.Si.",
        "197509182001121002",
        "Dr. Maria Rahantoknam, S.ST., M.Kes.",
        "Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman"
    )

    # 2. Pakta Integritas Resmi Bermaterai
    generate_integrity_pact_pdf(
        "pakta_integritas_resmi_ugm.pdf",
        "Dr. Ir. Budi Santoso, M.Sc.",
        "197403122000031001",
        "Universitas Gadjah Mada",
        "Bulaksumur, Caturtunggal, Sleman, D.I. Yogyakarta",
        "Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir"
    )
    generate_integrity_pact_pdf(
        "pakta_integritas_resmi_itb.pdf",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        "198104252005011003",
        "Institut Teknologi Bandung",
        "Jl. Ganesa No.10, Lb. Siliwangi, Coblong, Kota Bandung",
        "Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting"
    )
    generate_integrity_pact_pdf(
        "pakta_integritas_resmi_ipb.pdf",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        "197806142003121002",
        "Institut Pertanian Bogor",
        "Kampus IPB Dramaga, Babakan, Kec. Dramaga, Bogor",
        "Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting"
    )
    generate_integrity_pact_pdf(
        "pakta_integritas_resmi_unipa.pdf",
        "Prof. Dr. Frans Mayor, M.Si.",
        "196702111992031001",
        "Universitas Papua",
        "Jl. Gunung Salju, Amban, Kec. Manokwari Barat, Papua Barat",
        "Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini"
    )
    generate_integrity_pact_pdf(
        "pakta_integritas_resmi_uncen.pdf",
        "Dr. Maria Rahantoknam, S.ST., M.Kes.",
        "198208192006042004",
        "Universitas Cenderawasih",
        "Jl. Kamp Wolker, Yabansai, Heram, Kota Jayapura, Papua",
        "Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman"
    )

    # ==========================================================================
    # 3. KELOMPOK AGENDA DAERAH (5 PROPOSAL - SEMUA PASTI LOLOS GERBANG 1)
    # ==========================================================================
    print("\n--- Generating Group 1: 5 Agenda Proposals ---")
    
    # 1. PROP-2026-0001 (UGM - 145M)
    generate_proposal_pdf(
        "proposal_agenda_stunting_0001.pdf",
        "PROP-2026-0001",
        "Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir",
        "Dr. Ir. Budi Santoso, M.Sc.",
        "Universitas Gadjah Mada",
        "Kesehatan Masyarakat & Penanggulangan Stunting",
        "Distrik Mimika Timur dan Distrik Mimika Barat",
        4,
        145000000,
        "Prevalensi stunting di kawasan pesisir pantai masih menjadi tantangan mendesak dalam pembangunan manusia daerah. "
        "Meskipun kawasan pesisir memiliki limpahan sumber daya alam yang melimpah, anak balita usia 6-59 bulan rentan menderita "
        "defisiensi mikronutrien esensial akibat pola asupan makan yang didominasi karbohidrat sederhana tanpa asupan protein memadai. "
        "Sagu merupakan makanan pokok lokal yang melimpah, sedangkan ikan gabus rawa (Channa striata) memiliki kandungan albumin, "
        "asam amino esensial, dan seng (zinc) yang sangat tinggi untuk regenerasi sel somatik dan perbaikan kurva pertumbuhan linier balita. "
        "Oleh karena itu, riset ini merumuskan model intervensi gizi berbasis biskuit dan bubur formula fortifikasi tepung sagu dan tepung ikan gabus lokal.",
        "Metodologi riset dirancang menggunakan quasi-experimental design dengan pola pre-test post-test control group. "
        "Tahapan riset meliputi: 1) Formulasi laboratorium rasio tepung sagu dan tepung ikan gabus pada skala 70:30 dan 60:40; "
        "2) Uji proksimat, kadar protein, organoleptik, dan angka kecukupan gizi (AKG); 3) Pemberian intervensi biskuit fortifikasi "
        "selama 90 hari kalender kepada 80 sampel balita dengan pengawasan kader posyandu; 4) Pengukuran antropometri berkala (Z-score TB/U dan BB/TB) "
        "menggunakan software WHO Anthro; 5) Analisis statistik paired sample t-test dan regresi linear berganda untuk menguji signifikansi perbaikan status gizi.",
        "Riset ini menghasilkan output konkrit berupa: Dokumen Formulasi Standar Biskuit Fortifikasi Sagu-Ikan Gabus ramah anak, "
        "Buku Saku Panduan Praktis Kader Posyandu untuk Pemberian Makanan Tambahan Pemulihan (PMT-P), serta Naskah Kebijakan (Policy Brief) "
        "sebagai rekomendasi teknis integrasi program Dinas Kesehatan dan Dinas Ketahanan Pangan dalam APBD 2027."
    )
    generate_rab_pdf(
        "rab_agenda_stunting_0001.pdf",
        "PROP-2026-0001",
        "Model Intervensi Gizi Balita Berbasis Fortifikasi Tepung Sagu dan Ikan Gabus Lokal di Distrik Pesisir",
        "Dr. Ir. Budi Santoso, M.Sc.",
        145000000,
        [
            ("Honorarium Peneliti Utama dan Tim Ahli Gizi Masyarakat", 4, "Bulan", 12000000, 48000000),
            ("Belanja Bahan Baku Sagu, Ikan Gabus, dan Reagen Uji Lab Proksimat", 1, "Paket", 34500000, 34500000),
            ("Biaya Uji Laboratorium Akreditasi KAN Kandungan Albumin & Logam Berat", 8, "Sampel", 2500000, 20000000),
            ("Transportasi Survei Antropometri Lapangan Tim ke Distrik Pesisir", 4, "Kunjungan", 5000000, 20000000),
            ("Honor Kader Posyandu Pemantau Harian Balita Stunting", 15, "Orang/Bln", 1000000, 15000000),
            ("Penyelenggaraan FGD Lintas Sektor dan Diseminasi Laporan Hasil Riset", 1, "Kegiatan", 7500000, 7500000),
        ]
    )

    # 2. PROP-2026-0002 (ITB - 135M)
    generate_proposal_pdf(
        "proposal_agenda_stunting_0002.pdf",
        "PROP-2026-0002",
        "Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        "Institut Teknologi Bandung",
        "Infrastruktur Wilayah, Permukiman & Penataan Ruang",
        "Distrik Wania dan Distrik Kuala Kencana",
        3,
        135000000,
        "Pemberian makanan bergizi tinggi seringkali menjadi kontraproduktif dan tidak berdampak signifikan terhadap pencegahan stunting "
        "apabila lingkungan pemukiman anak balita mengalami kontaminasi fecal coliform akibat sanitasi buruk dan ketiadaan jamban sehat keluarga. "
        "Environmental enteric dysfunction (EED) kronis yang dipicu infeksi parasit dan diare berulang menghambat penyerapan nutrisi pada dinding usus halus. "
        "Berdasarkan fenomena tersebut, penelitian ini bertujuan mengidentifikasi titik kritis kegagalan konvergensi intervensi sanitasi dasar (STBM) "
        "dan ketersediaan sarana air bersih layak minum pada kantong permukiman padat pedesaan dalam memutus transmisi kuman penyebab stunting.",
        "Metodologi riset menerapkan pendekatan spasial kuantitatif terintegrasi dengan pemodelan Geographic Information System (GIS) multi-kriteria. "
        "Tahapan riset mencakup: 1) Pemetaan spasial sebaran sumur gali warga, jarak terhadap septic tank, dan riwayat kejadian balita stunting di 120 RT; "
        "2) Pengambilan sampel air tanah pada 40 titik sumber air untuk uji mikrobiologi bakteri E. coli di Balai Laboratorium Kesehatan Daerah; "
        "3) Survei sanitasi berbasis pilar STBM pada 180 rumah tangga sasaran; 4) Rancang bangun sistem filtrasi air komunal sederhana berbasis pasir silika, karbon aktif, dan sinar UV; "
        "5) Analisis regresi logistik multivariat guna menentukan determinan sanitasi paling berpengaruh terhadap malnutrisi anak.",
        "Luaran riset menghasilkan Atlas Spasial Kerentanan Sanitasi & Risiko Stunting Skala Distrik, Desain Rinci Teknis (DED) Sarana Filtrasi Air Bersih Komunal Ramah Lingkungan, "
        "dan Rancangan Standar Operasional Prosedur (SOP) Konvergensi Lintas OPD antara Dinas PUPR, Dinas Kesehatan, dan Bappeda."
    )
    generate_rab_pdf(
        "rab_agenda_stunting_0002.pdf",
        "PROP-2026-0002",
        "Optimalisasi Konvergensi Program Sanitasi Total Berbasis Masyarakat (STBM) dan Akses Air Bersih dalam Pencegahan Stunting",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        135000000,
        [
            ("Honorarium Peneliti Teknik Lingkungan dan Ahli GIS Pemetaan", 3, "Bulan", 14000000, 42000000),
            ("Pengambilan Sampel & Pengujian Mikrobiologi Kualitas Air Bersih di Labkesda", 40, "Titik Uji", 750000, 30000000),
            ("Survei Lapangan Verifikasi Pilar STBM dan Peta Spasial Sanitasi Rumah Tangga", 1, "Paket", 28000000, 28000000),
            ("Penyusunan DED Model Purwarupa Sarana Filtrasi Air Bersih Komunal Ramah Bencana", 1, "Paket", 22000000, 22000000),
            ("FGD Validasi Data Lapangan dengan Dinas PUPR & Bappeda serta Laporan Akhir", 1, "Paket", 13000000, 13000000),
        ]
    )

    # 3. PROP-2026-0003 (IPB - 140M)
    generate_proposal_pdf(
        "proposal_agenda_stunting_0003.pdf",
        "PROP-2026-0003",
        "Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        "Institut Pertanian Bogor",
        "Kelautan, Perikanan & Pemberdayaan Masyarakat Pesisir",
        "Distrik Mimika Tengah",
        4,
        140000000,
        "Wilayah pesisir perairan daerah memiliki potensi hasil tangkapan laut berlimpah seperti ikan kembung, tongkol, dan kakap putih "
        "yang kaya akan asam lemak omega-3, DHA, EPA, dan protein bioaktif tinggi. Namun ironisnya, angka balita kurus (wasting) dan gagal tumbuh (stunting) "
        "pada keluarga nelayan tradisional masih tinggi akibat pola pemberian makanan pendamping ASI (MP-ASI) yang keliru serta kurangnya inovasi "
        "pengolahan ikan segar menjadi makanan anak yang higienis, lezat, dan tahan simpan. "
        "Penelitian ini mendesain formulasi makanan tambahan berbasis hidrolisat konsentrat protein ikan (KPI) lokal segar yang aman dicerna balita usia dini.",
        "Metodologi riset menggunakan pendekatan action research dan evaluasi klinis nutrisi lapangan. "
        "Tahapan meliputi: 1) Ekstraksi tepung protein ikan murni menggunakan metode pemisahan mekanis dan pengeringan suhu rendah; "
        "2) Pembuatan kudapan PMT bergizi tinggi berupa nugget ikan sayur dan biskuit ikan bebas duri dan amis; "
        "3) Uji daya simpan, mikrobiologi angka kuman, serta uji penerimaan organoleptik oleh ibu balita di lokus pesisir; "
        "4) Pemberian PMT selama 60 hari kepada 60 balita gizi kurang di bawah pemantauan tenaga kesehatan puskesmas; "
        "5) Evaluasi penambahan berat badan mingguan dan laju kenaikan tinggi badan balita.",
        "Riset ini memberikan panduan hilirisasi produk perikanan daerah bernilai gizi tinggi, draf kebijakan pengadaan bahan baku lokal untuk PMT puskesmas, "
        "serta rekomendasi alokasi belanja Dinas Perikanan dan Dinas Kesehatan dalam mendukung Gerakan Memasyarakatkan Makan Ikan (Gemarikan)."
    )
    generate_rab_pdf(
        "rab_agenda_stunting_0003.pdf",
        "PROP-2026-0003",
        "Pemberian Makanan Tambahan (PMT) Berbahan Dasar Protein Laut Segar Terhadap Pertumbuhan Balita Wasting",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        140000000,
        [
            ("Honorarium Tim Ahli Teknologi Pascapanen Perikanan dan Gizi Klinis", 4, "Bulan", 11500000, 46000000),
            ("Pengadaan Bahan Baku Ikan Segar Nelayan dan Formulasi Ekstraksi KPI", 1, "Paket", 32000000, 32000000),
            ("Uji Laboratorium Proksimat Nilai Cerna Protein dan Asam Lemak Omega-3", 1, "Paket", 18000000, 18000000),
            ("Logistik Distribusi PMT dan Monitoring Asupan Nutrisi Balita Nelayan", 4, "Bulan", 7500000, 30000000),
            ("Pelatihan Ibu Balita Nelayan, Lokakarya Desiminasi Hasil, dan Naskah KAK", 1, "Kegiatan", 14000000, 14000000),
        ]
    )

    # 4. PROP-2026-0005 (UNIPA - 148M)
    generate_proposal_pdf(
        "proposal_agenda_stunting_0005.pdf",
        "PROP-2026-0005",
        "Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini",
        "Prof. Dr. Frans Mayor, M.Si.",
        "Universitas Papua",
        "Sosial, Kependudukan & Kebudayaan",
        "Distrik Mimika Baru dan Distrik Iwaka",
        4,
        148000000,
        "Pati sagu (Metroxylon sagu) merupakan makanan pokok kultural masyarakat adat yang telah dikonsumsi secara turun-temurun. "
        "Meskipun memiliki keunggulan karbohidrat kompleks indeks glikemik rendah dan ramah pencernaan anak, pola pengolahan tradisional (papeda polos) "
        "seringkali tidak diimbangi dengan sumber pangan protein hewani dan asam folat, sehingga memicu perlambatan pertumbuhan linier tulang pada usia emas (golden age 1000 HPK). "
        "Kajian ini bertujuan mengungkap secara ilmiah hubungan kausalitas antara frekuensi konsumsi pangan olahan sagu dan tingkat perkembangan neurokognitif balita di wilayah pedesaan.",
        "Metode riset mengaplikasikan desain studi kohort observasional prospektif selama 16 minggu pada 75 pasang ibu dan balita. "
        "Tahapan riset mencakup: 1) Registrasi kohort dan pencatatan riwayat asupan makanan melalui metode food recall 24 jam berkala 3 kali seminggu; "
        "2) Pengukuran indeks antropometri TB/U, BB/U, dan lingkar kepala bayi sesuai standar Kemenkes RI; "
        "3) Asesmen perkembangan motorik kasar, motorik halus, dan bahasa menggunakan instrumen Denver Developmental Screening Test II (DDST-II); "
        "4) Analisis multivariat Cox regression dan structural equation modeling (SEM) untuk mengisolasi faktor perancu sosial ekonomi keluarga.",
        "Kajian ini menghasilkan Peta Profil Pola Asuh Gizi Komunitas Adat, Model Modifikasi Resep Menu Sagu Berimbang Kaya Mikronutrien Ramah Anak, "
        "serta Rumusan Kebijakan Perlindungan Ketahanan Pangan Adat Berperspektif Gender untuk Dinas Pemberdayaan Masyarakat dan Bappeda."
    )
    generate_rab_pdf(
        "rab_agenda_stunting_0005.pdf",
        "PROP-2026-0005",
        "Studi Korelasi Asupan Gizi Sagu Tradisional Terhadap Pertumbuhan Linier dan Kognitif Anak Usia Dini",
        "Prof. Dr. Frans Mayor, M.Si.",
        148000000,
        [
            ("Honorarium Peneliti Sosial Budaya Gizi dan Psikolog Perkembangan Anak", 4, "Bulan", 12500000, 50000000),
            ("Survei Lapangan Food Recall 24 Jam dan Asesmen DDST-II pada Balita Adat", 1, "Paket", 38000000, 38000000),
            ("Pengadaan Kit Asesmen Perkembangan Kognitif dan Pengukur Panjang Badan", 1, "Paket", 22000000, 22000000),
            ("Transportasi Tim Peneliti ke Kampung Wilayah Pedalaman Distrik Iwaka", 4, "Bulan", 6000000, 24000000),
            ("FGD Pemangku Adat, Tokoh Agama, dan Penyusunan Laporan Rekomendasi Pemda", 1, "Kegiatan", 14000000, 14000000),
        ]
    )

    # 5. PROP-2026-0011 (UNCEN - 138M) - NEW 5th AGENDA COMPETITOR
    generate_proposal_pdf(
        "proposal_agenda_stunting_0011.pdf",
        "PROP-2026-0011",
        "Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman",
        "Dr. Maria Rahantoknam, S.ST., M.Kes.",
        "Universitas Cenderawasih",
        "Kesehatan Masyarakat & Penanggulangan Stunting",
        "Kawasan Pedalaman Distrik Jita dan Distrik Agimuga",
        4,
        138000000,
        "Wilayah geografis pedalaman yang terisolir menghadapi tantangan ganda dalam penanganan stunting: kerentanan akses logistik pangan pokok bergizi "
        "dan kuatnya pengaruh tabu adat terkait larangan makanan berprotein bagi ibu hamil dan menyusui. "
        "Anak usia di bawah dua tahun (baduta) di kampung pedalaman memiliki prevalensi stunting melebihi 35%, yang sebagian besar berakar dari praktik pemberian "
        "makanan pendamping ASI yang terlalu dini berupa pisang mentah atau air rebusan umbi tanpa sanitasi higienis. "
        "Penelitian ini bertujuan mengevaluasi determinan ketahanan pangan tingkat rumah tangga dan merumuskan intervensi edukasi pola asuh berbasis kearifan lokal.",
        "Metodologi riset menggunakan pendekatan mixed methods sekuensial eksplanatori. "
        "Tahapan riset mencakup: 1) Pengukuran status ketahanan pangan keluarga menggunakan Household Food Insecurity Access Scale (HFIAS); "
        "2) Observasi partisipatoris praktik pengasuhan dan pemberian ASI eksklusif pada 90 keluarga di 6 kampung pedalaman; "
        "3) Indepth interview dengan tokoh adat, dukun beranak, dan bidan desa mengenai hambatan sosiokultural; "
        "4) Evaluasi antropometri berkala Z-score anak baduta; 5) Formulasi program Komunikasi Perubahan Perilaku (KPP) berbasis bahasa daerah lokal.",
        "Luaran riset menghasilkan Panduan Komunikasi Antar-Pribadi (KAP) untuk Kader Posyandu Pedalaman, Peta Indeks Kerawanan Pangan Rumah Tangga Berbasis Kampung, "
        "dan Rekomendasi Rencana Aksi Daerah Penurunan Stunting Terintegrasi untuk Dinas Kesehatan dan Dinas Pemberdayaan Masyarakat Kampung."
    )
    generate_rab_pdf(
        "rab_agenda_stunting_0011.pdf",
        "PROP-2026-0011",
        "Evaluasi Pola Asuh dan Ketahanan Pangan Rumah Tangga dalam Pencegahan Balita Stunting di Kawasan Pedalaman",
        "Dr. Maria Rahantoknam, S.ST., M.Kes.",
        138000000,
        [
            ("Honorarium Peneliti Kesehatan Ibu & Anak dan Ahli Antropologi Kesehatan", 4, "Bulan", 11000000, 44000000),
            ("Survei Lapangan Skala Rumah Tangga HFIAS dan Antropometri Baduta Pedalaman", 1, "Paket", 34000000, 34000000),
            ("Sewa Perahu Ketinting dan Transportasi Ekspedisi Tim ke Distrik Terisolir", 4, "Trip", 7500000, 30000000),
            ("Pelatihan Kader Kampung dan Penyusunan Modul Komunikasi Perubahan Perilaku", 1, "Paket", 18000000, 18000000),
            ("Diseminasi Laporan Hasil Kajian Bersama Tim TPPS Pemda dan Pemangku Adat", 1, "Kegiatan", 12000000, 12000000),
        ]
    )

    # ==========================================================================
    # 4. KELOMPOK PENGAJUAN INISIATIF (5 PROPOSAL: 2 LOLOS G1, 3 GAGAL G1)
    # ==========================================================================
    print("\n--- Generating Group 2: 5 Initiative Proposals ---")

    # Inisiatif 1: PROP-2026-0006 (IPB - 88M) -> LOLOS GERBANG 1 (ADMIN_PASSED)
    generate_proposal_pdf(
        "proposal_inisiatif_mangrove_0006.pdf",
        "PROP-2026-0006",
        "Kajian Daya Dukung Lingkungan dan Model Valuasi Ekonomi Jasa Ekosistem Hutan Mangrove Pesisir",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        "Institut Pertanian Bogor",
        "Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah",
        "Pesisir Distrik Mimika Barat Jauh",
        3,
        88000000,
        "Ekosistem hutan mangrove di kawasan pesisir menghadapi tekanan laju deforestasi dan degradasi habitat akibat penebangan kayu liar, "
        "aktivitas pertambangan di hulu, serta konversi tambak yang tidak terkendali. Kerusakan ini mengancam garis pantai dari abrasi pasang air laut, "
        "merusak habitat pemijahan ikan dan kepiting bakau bernilai ekonomis tinggi, serta menghilangkan potensi cadangan karbon biru (blue carbon). "
        "Penelitian inisiatif mandiri ini bertujuan menghitung nilai ekonomi total (Total Economic Value) jasa ekosistem mangrove dan memetakan batas daya dukung lingkungan pesisir.",
        "Metodologi riset memadukan analisis citra penginderaan jauh satelit Sentinel-2 dan metode valuasi ekonomi lingkungan terstandar internasional. "
        "Tahapan meliputi: 1) Analisis spasial Normalized Difference Vegetation Index (NDVI) dan kerapatan tajuk mangrove pada luasan 5.000 hektar; "
        "2) Survei valuasi langsung terhadap hasil tangkapan nelayan menggunakan Market Price Method; "
        "3) Valuasi fungsi perlindungan bencana abrasi menggunakan Replacement Cost Method; "
        "4) Wawancara 100 rumah tangga nelayan menggunakan Contingent Valuation Method (CVM) untuk mengukur kemauan membayar (WTP) konservasi; "
        "5) Perhitungan daya dukung lingkungan pesisir berbasis carrying capacity index.",
        "Penelitian ini menghasilkan Naskah Akademik Usulan Peraturan Daerah tentang Pengelolaan Terpadu Ekosistem Mangrove Daerah, "
        "Peta Zonasi Lindung dan Pemanfaatan Berkelanjutan Pesisir, serta Draf Model Pembayaran Jasa Lingkungan (Payment for Ecosystem Services) untuk Dinas Lingkungan Hidup."
    )
    generate_rab_pdf(
        "rab_inisiatif_mangrove_0006.pdf",
        "PROP-2026-0006",
        "Kajian Daya Dukung Lingkungan dan Model Valuasi Ekonomi Jasa Ekosistem Hutan Mangrove Pesisir",
        "Dr. Hendra Gunawan, S.Pi., M.Si.",
        88000000,
        [
            ("Honorarium Ahli Valuasi Ekonomi Lingkungan dan Analis Citra Satelit", 3, "Bulan", 9500000, 28500000),
            ("Pengadaan Citra Satelit Resolusi Tinggi dan Lisensi Pemrosesan GIS Spasial", 1, "Paket", 18500000, 18500000),
            ("Survei Ekologi Hutan Mangrove dan Wawancara Nelayan Pesisir Mimika Barat", 1, "Paket", 23000000, 23000000),
            ("Sewa Perahu Tradisional untuk Ground Check Lapangan dan Uji Salinitas Air", 3, "Trip", 3000000, 9000000),
            ("FGD Konsultasi Publik dengan Dinas Lingkungan Hidup dan Finalisasi Laporan", 1, "Kegiatan", 9000000, 9000000),
        ]
    )

    # Inisiatif 2: PROP-2026-0007 (ITB - 95M) -> LOLOS GERBANG 1 (ADMIN_PASSED)
    generate_proposal_pdf(
        "proposal_inisiatif_pikohidro_0007.pdf",
        "PROP-2026-0007",
        "Rancang Bangun Pembangkit Listrik Pikohidro Portabel Berbasis Turbin Aliran Silang untuk Penerangan Kampung Terisolir",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        "Institut Teknologi Bandung",
        "Energi Terbarukan, Sains Terapan & Transformasi Digital",
        "Distrik Tembagapura dan Distrik Hoya",
        4,
        95000000,
        "Kondisi topografi pegunungan terjal dan keterisolasian jalur transportasi darat menjadi kendala utama perluasan jaringan transmisi listrik PLN "
        "ke kampung-kampung terpencil. Di sisi lain, kawasan permukiman warga memiliki potensi aliran anak sungai berarus deras dan kontinyu "
        "dengan beda tinggi (head) alami yang sangat ideal untuk pembangkitan listrik skala pikohidro (daya di bawah 5 kW). "
        "Riset terapan mandiri ini bertujuan merancang dan memproduksi purwarupa turbin pikohidro aliran silang (cross-flow) portabel yang mudah dirakit, "
        "tahan karat, dan dapat dioperasikan secara mandiri oleh masyarakat adat setempat untuk penerangan balai kampung dan sarana pendidikan.",
        "Metodologi riset mencakup pendekatan rancang bangun rekayasa mesin, pemodelan Computational Fluid Dynamics (CFD), dan uji unjuk kerja lapangan. "
        "Tahapan riset meliputi: 1) Pengukuran debit hidrologi aliran air sungai (flow rate) dan ketinggian jatuh air (head) di lokus percontohan; "
        "2) Perancangan bilah runner turbin aliran silang berefisiensi mekanis > 75% berbasis material komposit ringan anti-korosi; "
        "3) Perakitan generator magnet permanen (PMG) dan kontroler beban elektronik (ELC); "
        "4) Uji laboratorium unjuk kerja daya keluaran dan kestabilan frekuensi tegangan; "
        "5) Instalasi percontohan di 1 balai kampung sasaran serta pelatihan teknik perawatan bagi 5 pemuda kampung.",
        "Output penelitian berupa 1 Unit Purwarupa Turbin Pikohidro Portabel Terpasang Siap Pakai berkapasitas 1.000 Watt, "
        "Buku Petunjuk Operasi dan Perawatan (Manual Operation & Maintenance) Berbahasa Sederhana, serta Naskah Rekomendasi Rencana Induk Elektrifikasi Kampung Terisolir untuk Dinas PUPR dan Bappeda."
    )
    generate_rab_pdf(
        "rab_inisiatif_pikohidro_0007.pdf",
        "PROP-2026-0007",
        "Rancang Bangun Pembangkit Listrik Pikohidro Portabel Berbasis Turbin Aliran Silang untuk Penerangan Kampung Terisolir",
        "Dr. Eng. Wahyu Pratama, S.T., M.T.",
        95000000,
        [
            ("Honorarium Ahli Rekayasa Turbin Air dan Ahli Sistem Elektrikal", 4, "Bulan", 8500000, 34000000),
            ("Fabrikasi Mekanikal Runner Turbin Cross-Flow dan Rangka Portabel Anti-Karat", 1, "Paket", 26000000, 26000000),
            ("Pengadaan Komponen Generator Magnet Permanen (PMG) dan Electronic Load Controller", 1, "Paket", 15000000, 15000000),
            ("Biaya Ekspedisi Pengiriman Alat & Logistik Perakitan ke Lokus Kampung Pegunungan", 1, "Paket", 12000000, 12000000),
            ("Pelatihan Teknisi Lokal Kampung, Uji Pembebanan Listrik, dan Dokumentasi Laporan", 1, "Paket", 8000000, 8000000),
        ]
    )

    # Inisiatif 3: PROP-2026-0008 (UGM - 75M) -> GAGAL GERBANG 1 (RAB DUMMY TANPA ANGKA)
    generate_proposal_pdf(
        "proposal_inisiatif_sampah_0008.pdf",
        "PROP-2026-0008",
        "Strategi Pengelolaan Sampah Perkotaan Terpadu Melalui Sirkular Ekonomi Berbasis Bank Sampah Unit Sekolah dan Pasar",
        "Dr. Ir. Budi Santoso, M.Sc.",
        "Universitas Gadjah Mada",
        "Lingkungan Hidup, Kehutanan & Mitigasi Bencana Daerah",
        "Wilayah Perkotaan Timika (Distrik Mimika Baru)",
        3,
        75000000,
        "Pertumbuhan populasi perkotaan dan tingginya aktivitas perniagaan pasar tradisional menimbulkan eskalasi timbulan sampah harian "
        "yang melampaui kapasitas daya tampung Tempat Pemrosesan Akhir (TPA). Lebih dari 65% komposisi timbulan sampah merupakan sisa organik "
        "dan plastik sekali pakai yang belum terpilah di hulu, menimbulkan potensi pencemaran air tanah oleh lindi dan emisi gas rumah kaca metana. "
        "Penelitian ini bertujuan memetakan rantai nilai daur ulang sampah dan merancang model kelembagaan bank sampah terintegrasi berbasis institusi pendidikan dan pasar.",
        "Metodologi riset menggunakan pendekatan karakterisasi sampah SNI 19-3964-1994 dan pemodelan sirkular ekonomi terapan. "
        "Tahapan meliputi: sampling timbulan sampah pada 60 titik sekolah dan pasar, analisis laju timbulan per kapita, formulasi sistem insentif tabungan sampah berbasis aplikasi mobile, "
        "serta perumusan draf standar operasional pemilahan sampah organik untuk kompos cair bio-aktivator.",
        "Riset menghasilkan Cetak Biru (Blueprint) Tata Kelola Sampah Berbasis Komunitas dan Draf Rancangan Peraturan Bupati tentang Penyelenggaraan Bank Sampah Perkotaan."
    )
    # RAB DEFECTIVE: Kosong tanpa angka
    generate_dummy_text_rab(
        "rab_kosong_tanpa_angka_0008.pdf",
        "Strategi Pengelolaan Sampah Perkotaan Terpadu Melalui Sirkular Ekonomi Berbasis Bank Sampah Unit Sekolah dan Pasar",
        "Dr. Ir. Budi Santoso, M.Sc."
    )

    # Inisiatif 4: PROP-2026-0009 (UNIPA - 82M) -> GAGAL GERBANG 1 (BELANJA MODAL TERLARANG)
    generate_proposal_pdf(
        "proposal_inisiatif_kopi_0009.pdf",
        "PROP-2026-0009",
        "Model Hilirisasi Komoditas Kopi Arabika Dataran Tinggi Melalui Penguatan Rantai Pasok dan Kemitraan Koperasi Produsen",
        "Prof. Dr. Frans Mayor, M.Si.",
        "Universitas Papua",
        "Perekonomian, Perdagangan, UMKM & Keuangan Daerah",
        "Lembah Pegunungan Distrik Alama dan Bela",
        4,
        82000000,
        "Kawasan lembah pegunungan tinggi memiliki agroklimat mikro dan ketinggian tanah di atas 1.600 mdpl yang sangat ideal bagi budidaya kopi arabika specialty. "
        "Namun kendala hilirisasi komoditas kopi lokal terletak pada rantai distribusi yang terisolir, ketergantungan pada tengkulak dengan harga beli rendah, "
        "serta proses pascapanen tradisional tanpa kontrol fermentasi dan kadar air yang merusak profil cita rasa kopi. "
        "Penelitian ini mengkaji model kelembagaan koperasi produsen kopi dan kemitraan off-taker guna meningkatkan daya saing petani lokal di pasar ekspor.",
        "Metodologi riset mengombinasikan Value Chain Analysis (VCA), uji profil mutu rasa kopi (cupping score standar Specialty Coffee Association of America / SCAA), "
        "dan participatory action research bersama 4 kelompok tani di distrik pegunungan. Tahapan mencakup analisis margin tataniaga, standardisasi fermentasi wet hulling, "
        "dan penyusunan draf nota kesepahaman (MoU) kemitraan usaha mikro dengan pelaku industri kedai kopi modern.",
        "Riset menghasilkan Peta Rantai Nilai Kopi Arabika Daerah, Profil Mutu Cita Rasa Kopi Indikasi Geografis, dan Pedoman Operasional Koperasi Produsen Kopi Daerah."
    )
    # RAB DEFECTIVE: Ada Laptop MacBook, iPhone, Kamera DSLR & Selisih Anggaran
    generate_prohibited_rab(
        "rab_belanja_modal_terlarang_0009.pdf",
        "PROP-2026-0009",
        "Model Hilirisasi Komoditas Kopi Arabika Dataran Tinggi Melalui Penguatan Rantai Pasok dan Kemitraan Koperasi Produsen",
        "Prof. Dr. Frans Mayor, M.Si.",
        82000000
    )

    # Inisiatif 5: PROP-2026-0010 (UNCEN - 79M) -> GAGAL GERBANG 1 (NASKAH PROPOSAL DUMMY)
    # Naskah Bodong
    generate_dummy_proposal_bodong("naskah_proposal_dummy_bodong_0010.pdf")
    # RAB Valid
    generate_rab_pdf(
        "rab_inisiatif_adat_0010.pdf",
        "PROP-2026-0010",
        "Penguatan Peran Lembaga Musyawarah Adat dalam Mediasi Sengketa Ulayat Tanah untuk Kepastian Investasi Daerah",
        "Dr. Maria Rahantoknam, S.ST., M.Kes.",
        79000000,
        [
            ("Honorarium Ahli Hukum Adat dan Mediator Konflik Pertanahan", 3, "Bulan", 9000000, 27000000),
            ("Survei Sosiologis Penelusuran Silsilah Marga dan Pemetaan Batas Ulayat", 1, "Paket", 24000000, 24000000),
            ("Penyelenggaraan Forum Mediasi Restoratif Lembaga Adat dan Investor", 2, "Kegiatan", 8000000, 16000000),
            ("Penyusunan Naskah Kebijakan Perbup Pedoman Peradilan Perdamaian Adat", 1, "Paket", 12000000, 12000000),
        ]
    )

    # ==========================================================================
    # 5. OVERWRITE DOKUMEN DEFAULT/FALLBACK AGAR SEMUA SISTEM AMAN
    # ==========================================================================
    print("\n--- Updating Fallback Documents ---")
    generate_proposal_pdf(
        "dokumen_proposal_resmi.pdf",
        "PROP-STANDAR-2026",
        "Naskah Proposal Kajian Ilmiah Pembangunan Riset Terpadu Daerah",
        "Tim Peneliti Utama Perguruan Tinggi",
        "Universitas Negeri Mitra BRIDA",
        "Kebijakan Publik & Pembangunan Daerah Terpadu",
        "Wilayah Kabupaten/Kota",
        4,
        140000000,
        "Pemerintah Daerah memerlukan dukungan bukti ilmiah (evidence-based policy) dalam merumuskan arah kebijakan pembangunan yang terukur, "
        "efektif, dan berorientasi pada peningkatan kesejahteraan masyarakat secara merata. Naskah proposal penelitian ini mengkaji permasalahan riil di daerah "
        "dengan menyelaraskan isu-isu prioritas pembangunan jangka menengah daerah terhadap indikator kinerja utama perangkat daerah terkait.",
        "Metodologi penelitian dirancang secara komprehensif menggunakan perpaduan pendekatan kualitatif dan kuantitatif (mixed methods). "
        "Tahapan meliputi studi pustaka regulasi daerah, survei observasi lapangan dengan instrumen terstandar, wawancara mendalam informan kunci, "
        "Focus Group Discussion (FGD) lintas pemangku kepentingan, serta pengolahan data menggunakan teknik analisis statistik dan analisis konten kebijakan.",
        "Hasil kajian menghasilkan dokumen laporan akhir ilmiah terakreditasi, Executive Summary untuk Pengambil Keputusan, "
        "serta Policy Brief rekomendasi teknis implementatif yang siap diadopsi ke dalam Dokumen Rencana Kerja Pemerintah Daerah (RKPD)."
    )
    generate_rab_pdf(
        "rincian_rab_sbm.pdf",
        "PROP-STANDAR-2026",
        "Naskah Proposal Kajian Ilmiah Pembangunan Riset Terpadu Daerah",
        "Tim Peneliti Utama Perguruan Tinggi",
        140000000,
        [
            ("Honorarium Peneliti Utama dan Tim Asisten Peneliti Sesuai SBM", 4, "Bulan", 12000000, 48000000),
            ("Belanja ATK, Perlengkapan Survei Lapangan, dan Bahan Riset", 1, "Paket", 32000000, 32000000),
            ("Transportasi Lokal dan Akomodasi Tim Survei ke Wilayah Sasaran", 1, "Paket", 35000000, 35000000),
            ("Penyelenggaraan Lokakarya FGD Validasi Data dan Laporan Rekomendasi", 1, "Paket", 25000000, 25000000),
        ]
    )
    generate_cover_letter_pdf(
        "surat_pengantar_dekanat.pdf",
        "Universitas Negeri Mitra BRIDA",
        "0112/UN-MITRA/LPPM/TU/2026",
        "10 Januari 2026",
        "Prof. Dr. Ir. H. Mulyadi, M.Eng.",
        "196603121991031002",
        "Tim Peneliti Utama Perguruan Tinggi",
        "Naskah Proposal Kajian Ilmiah Pembangunan Riset Terpadu Daerah"
    )
    generate_integrity_pact_pdf(
        "pakta_integritas_materai.pdf",
        "Tim Peneliti Utama Perguruan Tinggi",
        "197801012002121001",
        "Universitas Negeri Mitra BRIDA",
        "Kawasan Kampus Pusat Riset Terapan Daerah",
        "Naskah Proposal Kajian Ilmiah Pembangunan Riset Terpadu Daerah"
    )

    print("\n=== ALL TEST PDF DOCUMENTS SUCCESSFULLY GENERATED! ===")

if __name__ == '__main__':
    main()
