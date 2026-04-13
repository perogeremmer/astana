// PDF Receipt generation for payment receipts (A6 size: 105mm x 148mm)

use printpdf::*;
use std::fs;
use std::io::{BufWriter, Read, Write};

use crate::utils::terbilang_indonesia;

/// Data for a single year receipt
#[derive(Debug, Clone)]
pub struct SingleReceiptData {
    pub receipt_number: String,
    pub payment_date: String,
    pub received_from: String,
    pub address: String,
    pub amount: i64,
    pub year: i32,
    pub grave_number: String,
    pub block_code: String,
    pub deceased_name: String,
    pub receiver_name: String,
    pub foundation_name: String,
}

/// Data for combined receipt (all years)
#[derive(Debug, Clone)]
pub struct CombinedReceiptItem {
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
}

#[derive(Debug, Clone)]
pub struct CombinedReceiptData {
    pub receipt_number: String,
    pub block_code: String,
    pub grave_number: String,
    pub deceased_name: String,
    pub heir_name: String,
    pub address: String,
    pub items: Vec<CombinedReceiptItem>,
    pub total_amount: i64,
    pub receiver_name: String,
    pub foundation_name: String,
}

fn format_number(num: i64) -> String {
    num.to_string()
        .as_bytes()
        .rchunks(3)
        .rev()
        .map(std::str::from_utf8)
        .collect::<Result<Vec<&str>, _>>()
        .unwrap()
        .join(".")
}

fn format_rupiah(amount: i64) -> String {
    format!("Rp. {}", format_number(amount))
}

/// Helper to save PDF document to a Vec<u8> buffer.
/// printpdf's save() works reliably with a File-backed BufWriter,
/// so we write to a temp file and read it back into memory.
fn save_pdf_to_buffer(doc: PdfDocumentReference) -> Result<Vec<u8>, String> {
    let temp_path =
        std::env::temp_dir().join(format!("astana_receipt_{}.pdf", uuid::Uuid::new_v4()));

    // Write to temp file
    let file = fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp PDF file: {}", e))?;
    let mut writer = BufWriter::new(file);
    doc.save(&mut writer)
        .map_err(|e| format!("Failed to save PDF to temp file: {}", e))?;
    writer
        .flush()
        .map_err(|e| format!("Failed to flush PDF writer: {}", e))?;
    drop(writer);

    // Read back into memory
    let mut file =
        fs::File::open(&temp_path).map_err(|e| format!("Failed to open temp PDF file: {}", e))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|e| format!("Failed to read temp PDF file: {}", e))?;
    drop(file);

    // Clean up temp file
    let _ = fs::remove_file(&temp_path);

    Ok(buf)
}

/// Draw logo at top center if available
fn draw_logo(
    layer: &PdfLayerReference,
    _doc: &PdfDocumentReference,
    logo_data: &Option<Vec<u8>>,
    y_pos: Mm,
    max_height: Mm,
) -> Mm {
    if let Some(data) = logo_data {
        // Try to decode as image using image crate (via printpdf's re-export)
        if let Ok(img) = printpdf::image_crate::load_from_memory(data) {
            let (orig_w, orig_h) = (img.width() as f32, img.height() as f32);
            let scale = max_height.0 / orig_h;
            let width = Mm(orig_w * scale * 0.264583); // px to mm approx
            let height = Mm(max_height.0);
            let x = Mm(52.5) - (width / 2.0); // center on A6 width (105mm)

            let image_obj = Image::from_dynamic_image(&img);
            let transform = ImageTransform {
                translate_x: Some(x),
                translate_y: Some(y_pos),
                scale_x: Some(width.0 / orig_w * 2.83),
                scale_y: Some(height.0 / orig_h * 2.83),
                rotate: None,
                dpi: Some(300.0),
            };

            image_obj.add_to_layer(layer.clone(), transform);
            return Mm(10.0) + height;
        }
    }
    y_pos
}

/// Generate single year receipt PDF (A6: 105mm x 148mm)
pub fn generate_single_receipt_pdf(
    data: SingleReceiptData,
    logo_data: Option<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let (doc, page1, layer1) = PdfDocument::new(
        "Kwitansi Pembayaran Iuran Makam",
        Mm(105.0),
        Mm(148.0),
        "Layer 1",
    );

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();
    let layer = doc.get_page(page1).get_layer(layer1);

    let margin = Mm(8.0);
    let mut y = Mm(138.0);

    // Logo
    y = draw_logo(&layer, &doc, &logo_data, y, Mm(12.0));
    y -= Mm(4.0);

    // Foundation name - left aligned
    layer.use_text(&data.foundation_name, 9.0, margin, y, &font_bold);
    y -= Mm(5.0);

    // Title - left aligned
    layer.use_text("KWITANSI PEMBAYARAN IURAN MAKAM", 8.0, margin, y, &font);
    y -= Mm(8.0);

    // Receipt number and date
    layer.use_text(
        &format!("No. Kwitansi: {}", data.receipt_number),
        7.0,
        margin,
        y,
        &font_bold,
    );
    y -= Mm(5.0);
    layer.use_text(
        &format!("Tanggal: {}", data.payment_date),
        7.0,
        margin,
        y,
        &font,
    );
    y -= Mm(6.0);

    // Horizontal line
    layer.add_line(Line {
        points: vec![
            (Point::new(margin, y + Mm(3.0)), false),
            (Point::new(Mm(97.0), y + Mm(3.0)), false),
        ],
        is_closed: false,
    });
    y -= Mm(2.0);

    // Content with fixed labels - value_x moved further right to prevent overlap
    let label_x = margin;
    let value_x = Mm(55.0);
    let line_height = Mm(5.0);

    fn draw_label_value(
        layer: &PdfLayerReference,
        label: &str,
        value: &str,
        y: Mm,
        font: &IndirectFontRef,
        font_bold: &IndirectFontRef,
        label_x: Mm,
        value_x: Mm,
    ) {
        layer.use_text(label, 7.0, label_x, y, font);
        // Wrap long values
        let max_width = 55.0; // mm approx
        let mut current_line = String::new();
        let mut line_count = 0;
        for word in value.split_whitespace() {
            let test = if current_line.is_empty() {
                word.to_string()
            } else {
                format!("{} {}", current_line, word)
            };
            if test.len() as f32 * 1.8 > max_width {
                if !current_line.is_empty() {
                    layer.use_text(
                        &current_line,
                        7.0,
                        value_x,
                        y - Mm(line_count as f32 * 4.0),
                        font_bold,
                    );
                    line_count += 1;
                }
                current_line = word.to_string();
            } else {
                current_line = test;
            }
        }
        if !current_line.is_empty() {
            layer.use_text(
                &current_line,
                7.0,
                value_x,
                y - Mm(line_count as f32 * 4.0),
                font_bold,
            );
        }
    }

    // Telah terima dari
    draw_label_value(
        &layer,
        "Telah terima dari:",
        &data.received_from,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    // Alamat
    draw_label_value(
        &layer,
        "Alamat:",
        &data.address,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height * 1.5;

    // Uang sejumlah (terbilang)
    draw_label_value(
        &layer,
        "Uang sejumlah:",
        &terbilang_indonesia(data.amount),
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height * 2.0;

    // Untuk pembayaran
    draw_label_value(
        &layer,
        "Untuk pembayaran iuran tahun:",
        &data.year.to_string(),
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_label_value(
        &layer,
        "Makam No:",
        &data.grave_number,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_label_value(
        &layer,
        "Blok:",
        &data.block_code,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_label_value(
        &layer,
        "Almarhum/ah:",
        &data.deceased_name,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height * 1.5;

    // Amount in number
    layer.use_text("Rp.", 7.0, label_x, y, &font);
    layer.use_text(&format_rupiah(data.amount), 9.0, value_x, y, &font_bold);
    y -= Mm(14.0);

    // Horizontal line
    layer.add_line(Line {
        points: vec![
            (Point::new(margin, y + Mm(3.0)), false),
            (Point::new(Mm(97.0), y + Mm(3.0)), false),
        ],
        is_closed: false,
    });
    y -= Mm(6.0);

    // Tempat dan Tanggal - left aligned
    layer.use_text(
        "Tempat, Tanggal : ..............................................",
        7.0,
        margin,
        y,
        &font,
    );
    y -= Mm(12.0);

    // Signature section - left aligned
    layer.use_text("Penerima,", 7.0, margin, y, &font);
    y -= Mm(12.0);

    layer.use_text(
        &format!("( {} )", data.receiver_name),
        7.0,
        margin,
        y,
        &font_bold,
    );

    // Save PDF to buffer via temp file (proven working approach)
    save_pdf_to_buffer(doc)
}

/// Generate combined receipt PDF with all payments (A6: 105mm x 148mm)
pub fn generate_combined_receipt_pdf(
    data: CombinedReceiptData,
    logo_data: Option<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let (doc, page1, layer1) = PdfDocument::new(
        "Kwitansi Pembayaran Iuran Makam - Keseluruhan",
        Mm(105.0),
        Mm(148.0),
        "Layer 1",
    );

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();
    let layer = doc.get_page(page1).get_layer(layer1);

    let margin = Mm(6.0);
    let mut y = Mm(140.0);

    // Logo
    y = draw_logo(&layer, &doc, &logo_data, y, Mm(10.0));
    y -= Mm(3.0);

    // Foundation name - left aligned
    layer.use_text(&data.foundation_name, 8.0, margin, y, &font_bold);
    y -= Mm(4.0);

    // Title - left aligned
    layer.use_text("KWITANSI PEMBAYARAN IURAN MAKAM", 7.0, margin, y, &font);
    y -= Mm(6.0);

    // Receipt number
    layer.use_text(
        &format!("No. Kwitansi: {}", data.receipt_number),
        6.0,
        margin,
        y,
        &font_bold,
    );
    y -= Mm(5.0);

    // Horizontal line
    layer.add_line(Line {
        points: vec![
            (Point::new(margin, y + Mm(2.0)), false),
            (Point::new(Mm(99.0), y + Mm(2.0)), false),
        ],
        is_closed: false,
    });
    y -= Mm(2.0);

    // Header info
    let label_x = margin;
    let value_x = Mm(32.0);
    let line_height = Mm(4.5);

    fn draw_small_label_value(
        layer: &PdfLayerReference,
        label: &str,
        value: &str,
        y: Mm,
        font: &IndirectFontRef,
        font_bold: &IndirectFontRef,
        label_x: Mm,
        value_x: Mm,
    ) {
        layer.use_text(label, 6.0, label_x, y, font);
        layer.use_text(value, 6.0, value_x, y, font_bold);
    }

    draw_small_label_value(
        &layer,
        "Blok / No:",
        &format!("{} / {}", data.block_code, data.grave_number),
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_small_label_value(
        &layer,
        "Nama Almarhum/ah:",
        &data.deceased_name,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_small_label_value(
        &layer,
        "Nama Ahli Waris:",
        &data.heir_name,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= line_height;

    draw_small_label_value(
        &layer,
        "Alamat:",
        &data.address,
        y,
        &font,
        &font_bold,
        label_x,
        value_x,
    );
    y -= Mm(6.0);

    // Table header
    let table_x = margin;
    let col_no = Mm(8.0);
    let col_year = Mm(18.0);
    let col_date = Mm(30.0);
    let col_amount = Mm(30.0);
    let _col_paraf = Mm(13.0);

    // Header background line
    layer.add_line(Line {
        points: vec![
            (Point::new(table_x, y + Mm(1.0)), false),
            (Point::new(Mm(99.0), y + Mm(1.0)), false),
        ],
        is_closed: false,
    });

    layer.use_text("No", 6.0, table_x + Mm(2.0), y - Mm(1.0), &font_bold);
    layer.use_text(
        "Thn",
        6.0,
        table_x + col_no + Mm(1.0),
        y - Mm(1.0),
        &font_bold,
    );
    layer.use_text(
        "Tanggal",
        6.0,
        table_x + col_no + col_year + Mm(1.0),
        y - Mm(1.0),
        &font_bold,
    );
    layer.use_text(
        "Iuran",
        6.0,
        table_x + col_no + col_year + col_date + Mm(1.0),
        y - Mm(1.0),
        &font_bold,
    );
    layer.use_text(
        "Paraf",
        6.0,
        table_x + col_no + col_year + col_date + col_amount + Mm(1.0),
        y - Mm(1.0),
        &font_bold,
    );

    y -= Mm(5.0);

    // Header bottom line
    layer.add_line(Line {
        points: vec![
            (Point::new(table_x, y + Mm(1.0)), false),
            (Point::new(Mm(99.0), y + Mm(1.0)), false),
        ],
        is_closed: false,
    });

    // Table rows
    for (i, item) in data.items.iter().enumerate() {
        let row_y = y - Mm(1.0);
        layer.use_text(&format!("{}", i + 1), 6.0, table_x + Mm(2.0), row_y, &font);
        layer.use_text(
            &item.year.to_string(),
            6.0,
            table_x + col_no + Mm(1.0),
            row_y,
            &font,
        );
        layer.use_text(
            &item.payment_date,
            5.0,
            table_x + col_no + col_year + Mm(1.0),
            row_y,
            &font,
        );
        layer.use_text(
            &format_number(item.amount),
            5.0,
            table_x + col_no + col_year + col_date + Mm(1.0),
            row_y,
            &font,
        );
        // Paraf column left blank

        y -= Mm(4.5);
    }

    // Table bottom line
    layer.add_line(Line {
        points: vec![
            (Point::new(table_x, y + Mm(1.0)), false),
            (Point::new(Mm(99.0), y + Mm(1.0)), false),
        ],
        is_closed: false,
    });

    // Total row
    y -= Mm(2.0);
    layer.use_text("TOTAL", 6.0, table_x + col_no + Mm(1.0), y, &font_bold);
    layer.use_text(
        &format_number(data.total_amount),
        6.0,
        table_x + col_no + col_year + col_date + Mm(1.0),
        y,
        &font_bold,
    );
    y -= Mm(4.0);

    // Total bottom line
    layer.add_line(Line {
        points: vec![
            (Point::new(table_x, y + Mm(1.0)), false),
            (Point::new(Mm(99.0), y + Mm(1.0)), false),
        ],
        is_closed: false,
    });
    y -= Mm(6.0);

    // Signature - left aligned
    layer.use_text("Penerima,", 6.0, margin, y, &font);
    y -= Mm(10.0);

    layer.use_text(
        &format!("( {} )", data.receiver_name),
        6.0,
        margin,
        y,
        &font_bold,
    );

    // Save PDF to buffer via temp file (proven working approach)
    save_pdf_to_buffer(doc)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_single_receipt_pdf() {
        let data = SingleReceiptData {
            receipt_number: "20250101123".to_string(),
            payment_date: "01-Jan-2025".to_string(),
            received_from: "Budi Santoso".to_string(),
            address: "Jl. Mawar No. 123".to_string(),
            amount: 670_000,
            year: 2025,
            grave_number: "12".to_string(),
            block_code: "A".to_string(),
            deceased_name: "Ahmad Subekti".to_string(),
            receiver_name: "Admin".to_string(),
            foundation_name: "Yayasan Makam Sejahtera".to_string(),
        };

        let result = generate_single_receipt_pdf(data, None);
        assert!(result.is_ok(), "PDF generation failed: {:?}", result.err());
        let buf = result.unwrap();
        assert!(
            buf.len() > 500,
            "PDF buffer too small, got {} bytes",
            buf.len()
        );
        println!("Single receipt PDF size: {} bytes", buf.len());

        // Verify PDF magic number
        assert_eq!(&buf[0..4], b"%PDF", "Generated file is not a valid PDF");
    }

    #[test]
    fn test_generate_combined_receipt_pdf() {
        let data = CombinedReceiptData {
            receipt_number: "20250101456".to_string(),
            block_code: "B".to_string(),
            grave_number: "7".to_string(),
            deceased_name: "Siti Aminah".to_string(),
            heir_name: "Ahmad Fauzi".to_string(),
            address: "Jl. Melati No. 45".to_string(),
            items: vec![
                CombinedReceiptItem {
                    year: 2023,
                    payment_date: "15-Jan-2023".to_string(),
                    amount: 500_000,
                },
                CombinedReceiptItem {
                    year: 2024,
                    payment_date: "20-Feb-2024".to_string(),
                    amount: 500_000,
                },
                CombinedReceiptItem {
                    year: 2025,
                    payment_date: "10-Mar-2025".to_string(),
                    amount: 600_000,
                },
            ],
            total_amount: 1_600_000,
            receiver_name: "Admin".to_string(),
            foundation_name: "Yayasan Makam Sejahtera".to_string(),
        };

        let result = generate_combined_receipt_pdf(data, None);
        assert!(result.is_ok(), "PDF generation failed: {:?}", result.err());
        let buf = result.unwrap();
        assert!(
            buf.len() > 500,
            "PDF buffer too small, got {} bytes",
            buf.len()
        );
        println!("Combined receipt PDF size: {} bytes", buf.len());

        // Verify PDF magic number
        assert_eq!(&buf[0..4], b"%PDF", "Generated file is not a valid PDF");
    }
}
