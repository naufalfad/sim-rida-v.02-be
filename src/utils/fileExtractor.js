const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const xlsx = require('xlsx');

// Daftar kata kunci pos belanja modal aset kantor yang DILARANG dalam riset swakelola daerah
const PROHIBITED_KEYWORDS = [
  'laptop', 'notebook', 'macbook', 'komputer', 'pc desktop',
  'smartphone', 'handphone', 'hp android', 'iphone',
  'printer', 'mesin fotocopy', 'scanner',
  'kamera', 'dslr', 'mirrorless', 'drone',
  'motor', 'sepeda motor', 'mobil', 'kendaraan bermotor',
  'ac split', 'televisi', 'tv led', 'proyektor'
];

/**
 * Mencari path fisik file di disk uploads
 */
function resolveFilePath(fileUrl) {
  if (!fileUrl) return null;

  // Normalisasi URL/path: bersihkan leading slash dan parameter query
  let cleanPath = fileUrl.split('?')[0].replace(/^\/+/, '');
  const baseUploadsDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

  // 1. Coba relative dari root backend (misal: "uploads/proposals/file.pdf")
  const candidate1 = path.join(__dirname, '..', '..', cleanPath);
  if (fs.existsSync(candidate1) && fs.statSync(candidate1).isFile()) {
    return candidate1;
  }

  // 2. Coba relative dalam uploads dir
  const candidate2 = path.join(baseUploadsDir, cleanPath.replace(/^uploads[\\\/]/i, ''));
  if (fs.existsSync(candidate2) && fs.statSync(candidate2).isFile()) {
    return candidate2;
  }

  // 3. Fallback: Cari nama file di subdirektori uploads
  const filename = path.basename(cleanPath);
  const subDirs = ['proposals', 'contracts', 'reports', 'milestones', 'dispositions', 'responses', 'needs'];
  for (const sub of subDirs) {
    const candidateSub = path.join(baseUploadsDir, sub, filename);
    if (fs.existsSync(candidateSub) && fs.statSync(candidateSub).isFile()) {
      return candidateSub;
    }
  }

  return null;
}

/**
 * Parsing file PDF menggunakan pdf-parse v2+
 */
async function parsePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    if (!dataBuffer || dataBuffer.length === 0) {
      return { success: false, format: 'PDF', error: 'File PDF kosong (0 bytes).' };
    }

    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();

    const text = (result?.text || '').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      success: true,
      format: 'PDF',
      fileSize: dataBuffer.length,
      text: text,
      wordCount: wordCount,
      pages: result.pages?.length || 1
    };
  } catch (err) {
    return {
      success: false,
      format: 'PDF',
      error: `Gagal membaca file PDF: ${err.message}`
    };
  }
}

/**
 * Parsing file Excel (.xlsx / .xls) menggunakan SheetJS
 */
function parseExcel(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { success: false, format: 'EXCEL', error: 'File Excel kosong (0 bytes).' };
    }

    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return { success: false, format: 'EXCEL', error: 'File Excel tidak memiliki lembar kerja (worksheet).' };
    }

    let allText = '';
    let totalRows = 0;
    const lineItems = [];
    let detectedTotal = null;

    sheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
      totalRows += rows.length;

      rows.forEach((row) => {
        if (!Array.isArray(row) || row.length === 0) return;
        const rowStr = row
          .map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''))
          .filter(Boolean)
          .join(' | ');

        if (rowStr) {
          allText += rowStr + '\n';
          lineItems.push(rowStr);

          // Coba deteksi baris total anggaran
          const lower = rowStr.toLowerCase();
          if (
            lower.includes('total') ||
            lower.includes('jumlah') ||
            lower.includes('grand total') ||
            lower.includes('subtotal')
          ) {
            row.forEach((cell) => {
              if (cell !== undefined && cell !== null) {
                const cleanNum = String(cell).replace(/[^0-9]/g, '');
                if (cleanNum && cleanNum.length >= 6) {
                  const val = parseInt(cleanNum, 10);
                  if (!isNaN(val) && val > 100000 && (!detectedTotal || val > detectedTotal)) {
                    detectedTotal = val;
                  }
                }
              }
            });
          }
        }
      });
    });

    const wordCount = allText.split(/\s+/).filter(Boolean).length;

    return {
      success: true,
      format: 'EXCEL',
      fileSize: stat.size,
      text: allText,
      wordCount: wordCount,
      sheetNames: sheetNames,
      totalRows: totalRows,
      lineItems: lineItems.slice(0, 30), // ambil sampel baris item
      extractedTotal: detectedTotal
    };
  } catch (err) {
    return {
      success: false,
      format: 'EXCEL',
      error: `Gagal membaca file Excel: ${err.message}`
    };
  }
}

/**
 * Universal file reader untuk PDF dan Excel
 */
async function parseFile(fileUrl) {
  const resolvedPath = resolveFilePath(fileUrl);
  if (!resolvedPath) {
    return {
      success: false,
      error: `File tidak ditemukan di disk server (${fileUrl || 'URL tidak tersedia'}).`
    };
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext === '.pdf') {
    return await parsePdf(resolvedPath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(resolvedPath);
  } else {
    return {
      success: false,
      format: ext.toUpperCase().replace('.', ''),
      error: `Format berkas ${ext} belum didukung untuk audit otomatis.`
    };
  }
}

/**
 * Ekstraksi kata kunci topik dari judul proposal (abaikan stopwords umum)
 */
function extractTitleKeywords(title) {
  if (!title) return [];
  const stopWords = new Set([
    'dalam', 'untuk', 'pada', 'yang', 'dengan', 'dari', 'oleh', 'atas', 'tentang',
    'terhadap', 'berbasis', 'studi', 'analisis', 'kajian', 'penelitian', 'pengembangan',
    'implementasi', 'model', 'strategi', 'evaluasi', 'upaya', 'peran', 'dan', 'atau',
    'desa', 'kota', 'daerah', 'tahun', 'kabupaten', 'provinsi', 'secara', 'melalui'
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

/**
 * Audit Menyeluruh 4 Berkas Pengajuan Peneliti (0 Token - Ekstraksi Lokal Backend)
 */
async function auditProposalFiles(proposal) {
  const result = {
    hasDummyFiles: false,
    hasBudgetDiscrepancy: false,
    hasProhibitedExpenses: false,
    auditFlags: [],
    proposalDoc: null,
    rabDoc: null,
    coverLetterDoc: null,
    integrityPactDoc: null
  };

  // 1. Audit Berkas Naskah Proposal Lengkap
  const propRes = await parseFile(proposal.proposalFileUrl);
  if (!propRes.success) {
    result.hasDummyFiles = true;
    result.auditFlags.push(`Naskah Proposal: ${propRes.error}`);
    result.proposalDoc = {
      status: 'DEFECTIVE',
      error: propRes.error,
      wordCount: 0,
      excerpt: ''
    };
  } else {
    const textLower = propRes.text.toLowerCase();
    const wordCount = propRes.wordCount;

    // Cek korelasi kata kunci judul terhadap isi naskah
    const titleKeywords = extractTitleKeywords(proposal.title);
    const matchedKeywords = titleKeywords.filter((k) => textLower.includes(k));
    const isCorrelated = titleKeywords.length === 0 || matchedKeywords.length >= 1;

    // Cek apakah berkas terlalu pendek (< 100 kata) atau template dummy
    const isGenericTemplate =
      textLower.includes('simrida') ||
      textLower.includes('sim-rida') ||
      textLower.includes('berkas otentik pendukung') ||
      (textLower.includes('bab i pendahuluan') && textLower.includes('jadwal pelaksanaan') && wordCount < 80);

    const isTooShort = wordCount < 100;

    if (isTooShort || !isCorrelated || isGenericTemplate) {
      result.hasDummyFiles = true;
      let flagMsg = '';
      if (!isCorrelated && wordCount < 200) {
        flagMsg = `Naskah Proposal terindikasi berkas dummy/tidak berkorelasi (hanya ${wordCount} kata dan 0 kata kunci judul "${proposal.title.substring(0, 45)}..." yang cocok).`;
      } else if (isTooShort) {
        flagMsg = `Naskah Proposal terindikasi berkas dummy/kosong (hanya ${wordCount} kata, standar minimal naskah proposal adalah 100 kata).`;
      } else {
        flagMsg = `Naskah Proposal terindikasi berkas template dummy bawaan sistem.`;
      }
      result.auditFlags.push(flagMsg);
      result.proposalDoc = {
        status: 'SUSPICIOUS_DUMMY',
        format: propRes.format,
        wordCount: propRes.wordCount,
        hasIntro: textLower.includes('pendahuluan') || textLower.includes('latar belakang'),
        hasMethod: textLower.includes('metod') || textLower.includes('tahapan'),
        titleCorrelation: isCorrelated,
        matchedKeywords,
        excerpt: propRes.text.substring(0, 300)
      };
    } else {
      result.proposalDoc = {
        status: 'VALID',
        format: propRes.format,
        wordCount: propRes.wordCount,
        hasIntro: textLower.includes('pendahuluan') || textLower.includes('latar belakang'),
        hasMethod: textLower.includes('metod') || textLower.includes('tahapan'),
        titleCorrelation: isCorrelated,
        matchedKeywords,
        excerpt: propRes.text.substring(0, 300)
      };
    }
  }

  // 2. Audit Berkas RAB (PDF atau Excel)
  const rabRes = await parseFile(proposal.rabFileUrl);
  if (!rabRes.success) {
    result.hasDummyFiles = true;
    result.auditFlags.push(`Berkas RAB: ${rabRes.error}`);
    result.rabDoc = {
      status: 'DEFECTIVE',
      error: rabRes.error,
      extractedTotal: null,
      prohibitedItems: []
    };
  } else {
    const textLower = rabRes.text.toLowerCase();
    const rawProhibited = [];

    // Deteksi kata kunci pos belanja modal terlarang
    PROHIBITED_KEYWORDS.forEach((keyword) => {
      if (textLower.includes(keyword)) {
        const lines = rabRes.text.split('\n');
        const matchedLine = lines.find((l) => l.toLowerCase().includes(keyword));
        rawProhibited.push(matchedLine ? matchedLine.trim() : keyword);
      }
    });
    const detectedProhibited = Array.from(new Set(rawProhibited));

    if (detectedProhibited.length > 0) {
      result.hasProhibitedExpenses = true;
      result.auditFlags.push(`Ditemukan pos belanja modal terlarang dalam RAB: ${detectedProhibited.join('; ')}`);
    }

    // Deteksi keberadaan angka rupiah / biaya di teks RAB
    // Cari angka dengan minimal 5 digit (misal: 25000, 100.000, 1.500.000)
    const costPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[\.,]\d{3})+(?:,\d{2})?|\b\d{5,}\b)/gi;
    const numericCostMatches = rabRes.text.match(costPattern) || [];
    const hasValidCostFigures = numericCostMatches.length > 0;

    // Bandingkan total nominal RAB berkas vs input form
    let extractedTotal = rabRes.extractedTotal;
    if (!extractedTotal) {
      // Cari angka di berkas PDF jika ada pola "Total: Rp ..." atau "Jumlah: Rp ..."
      const totalMatch = rabRes.text.match(/(?:total|jumlah|grand\s*total)\s*(?:biaya|anggaran|usulan|kegiatan|\s)*\s*(?:[:=]|\s)\s*(?:rp\.?\s*)?([\d\.,]+)/i);
      if (totalMatch && totalMatch[1]) {
        const cleanVal = parseInt(totalMatch[1].replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cleanVal) && cleanVal > 100000) {
          extractedTotal = cleanVal;
        }
      }
    }

    const proposedBudget = Number(proposal.proposedBudget || 0);
    let budgetDiscrepancy = 0;
    let isDiscrepancy = false;

    // Jika berkas RAB sama sekali tidak memiliki angka nominal biaya, ATAU tidak ada angka total
    const isRabWithoutFigures = !hasValidCostFigures || (!extractedTotal && rabRes.wordCount < 80);

    if (isRabWithoutFigures) {
      result.hasDummyFiles = true;
      result.hasBudgetDiscrepancy = true;
      budgetDiscrepancy = proposedBudget;
      isDiscrepancy = true;
      result.auditFlags.push(
        `Berkas RAB terindikasi berkas dummy/kosong: Tidak ditemukan tabel rincian biaya atau angka nominal rupiah yang dapat diverifikasi terhadap usulan form (Rp ${proposedBudget.toLocaleString('id-ID')}).`
      );
    } else if (extractedTotal && proposedBudget > 0) {
      budgetDiscrepancy = Math.abs(extractedTotal - proposedBudget);
      const discrepancyPercent = (budgetDiscrepancy / proposedBudget) * 100;
      if (discrepancyPercent > 5) {
        result.hasBudgetDiscrepancy = true;
        isDiscrepancy = true;
        result.auditFlags.push(
          `Diskrepansi Anggaran: Total berkas RAB (Rp ${extractedTotal.toLocaleString('id-ID')}) berbeda dengan isian form (Rp ${proposedBudget.toLocaleString('id-ID')}). Selisih: Rp ${budgetDiscrepancy.toLocaleString('id-ID')}.`
        );
      }
    }

    let status = 'VALID';
    if (detectedProhibited.length > 0) {
      status = 'PROHIBITED_ITEMS_DETECTED';
    } else if (isRabWithoutFigures) {
      status = 'NO_NUMERICAL_BREAKDOWN';
    } else if (isDiscrepancy) {
      status = 'DISCREPANCY_WARNING';
    } else if (rabRes.wordCount < 20) {
      status = 'SUSPICIOUS_DUMMY';
    }

    result.rabDoc = {
      status,
      format: rabRes.format,
      wordCount: rabRes.wordCount,
      extractedTotal,
      extractedTotalFormatted: extractedTotal ? `Rp ${extractedTotal.toLocaleString('id-ID')}` : null,
      formProposedBudget: proposedBudget,
      formProposedBudgetFormatted: `Rp ${proposedBudget.toLocaleString('id-ID')}`,
      budgetDiscrepancy,
      budgetDiscrepancyFormatted: `Rp ${budgetDiscrepancy.toLocaleString('id-ID')}`,
      isDiscrepancy,
      prohibitedItems: detectedProhibited,
      hasProhibitedItems: detectedProhibited.length > 0,
      hasValidCostFigures,
      excerpt: rabRes.text.substring(0, 300)
    };
  }

  // 3. Audit Berkas Surat Pengantar Dekanat/Lembaga
  const coverRes = await parseFile(proposal.coverLetterUrl);
  if (!coverRes.success) {
    result.hasDummyFiles = true;
    result.auditFlags.push(`Surat Pengantar: ${coverRes.error}`);
    result.coverLetterDoc = {
      status: 'DEFECTIVE',
      error: coverRes.error
    };
  } else {
    const textLower = coverRes.text.toLowerCase();
    const hasOfficialTerms =
      textLower.includes('surat') ||
      textLower.includes('nomor') ||
      textLower.includes('dekan') ||
      textLower.includes('rektor') ||
      textLower.includes('lembaga') ||
      textLower.includes('pengantar');

    const isDummy =
      coverRes.wordCount < 15 ||
      (coverRes.wordCount < 50 && (textLower.includes('simrida') || textLower.includes('sim-rida')));

    if (isDummy) {
      result.hasDummyFiles = true;
      result.auditFlags.push(`Surat Pengantar terindikasi berkas dummy/placeholder (hanya ${coverRes.wordCount} kata).`);
    }

    result.coverLetterDoc = {
      status: isDummy ? 'SUSPICIOUS_DUMMY' : hasOfficialTerms ? 'VALID' : 'UNOFFICIAL_HEADER',
      format: coverRes.format,
      wordCount: coverRes.wordCount,
      hasOfficialTerms,
      notes: isDummy
        ? 'Format surat pengantar terindikasi berkas dummy/placeholder'
        : hasOfficialTerms
        ? 'Format surat pengantar resmi institusi terverifikasi'
        : 'Tidak memuat istilah resmi pimpinan institusi / nomor surat'
    };
  }

  // 4. Audit Berkas Pakta Integritas Bermaterai
  const pactRes = await parseFile(proposal.integrityPactUrl);
  if (!pactRes.success) {
    result.hasDummyFiles = true;
    result.auditFlags.push(`Pakta Integritas: ${pactRes.error}`);
    result.integrityPactDoc = {
      status: 'DEFECTIVE',
      error: pactRes.error
    };
  } else {
    const textLower = pactRes.text.toLowerCase();
    const hasPactTerms =
      textLower.includes('integritas') ||
      textLower.includes('materai') ||
      textLower.includes('plagiasi') ||
      textLower.includes('tanggung jawab') ||
      textLower.includes('pernyataan');

    const isDummy =
      pactRes.wordCount < 15 ||
      (pactRes.wordCount < 50 && (textLower.includes('simrida') || textLower.includes('sim-rida')));

    if (isDummy) {
      result.hasDummyFiles = true;
      result.auditFlags.push(`Pakta Integritas terindikasi berkas dummy/placeholder (hanya ${pactRes.wordCount} kata).`);
    }

    result.integrityPactDoc = {
      status: isDummy ? 'SUSPICIOUS_DUMMY' : hasPactTerms ? 'VALID' : 'MISSING_INTEGRITY_CLAUSE',
      format: pactRes.format,
      wordCount: pactRes.wordCount,
      hasPactTerms,
      notes: isDummy
        ? 'Pakta integritas terindikasi berkas dummy/placeholder'
        : hasPactTerms
        ? 'Klausul pakta integritas dan materai terverifikasi'
        : 'Tidak memuat klausul integritas / bebas plagiasi yang disyaratkan'
    };
  }

  return result;
}

module.exports = {
  resolveFilePath,
  parsePdf,
  parseExcel,
  parseFile,
  auditProposalFiles,
  PROHIBITED_KEYWORDS
};
