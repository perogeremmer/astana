// Utility functions for the application

/// Convert a number to Indonesian words (terbilang)
/// Example: 670000 -> "ENAM RATUS TUJUH PULUH RIBU RUPIAH"
pub fn terbilang_indonesia(amount: i64) -> String {
    if amount == 0 {
        return "NOL RUPIAH".to_string();
    }

    let mut result = terbilang(amount);
    result.push_str(" RUPIAH");
    result.to_uppercase()
}

fn terbilang(n: i64) -> String {
    if n < 0 {
        return format!("MINUS {}", terbilang(-n));
    }

    let satuan = [
        "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
        "sepuluh", "sebelas",
    ];

    if n < 12 {
        return satuan[n as usize].to_string();
    } else if n < 20 {
        return format!("{} belas", terbilang(n - 10));
    } else if n < 100 {
        let puluhan = n / 10;
        let sisa = n % 10;
        if sisa == 0 {
            return format!("{} puluh", terbilang(puluhan));
        } else {
            return format!("{} puluh {}", terbilang(puluhan), terbilang(sisa));
        }
    } else if n < 200 {
        let sisa = n - 100;
        if sisa == 0 {
            return "seratus".to_string();
        } else {
            return format!("seratus {}", terbilang(sisa));
        }
    } else if n < 1000 {
        let ratusan = n / 100;
        let sisa = n % 100;
        if sisa == 0 {
            return format!("{} ratus", terbilang(ratusan));
        } else {
            return format!("{} ratus {}", terbilang(ratusan), terbilang(sisa));
        }
    } else if n < 2000 {
        let sisa = n - 1000;
        if sisa == 0 {
            return "seribu".to_string();
        } else {
            return format!("seribu {}", terbilang(sisa));
        }
    } else if n < 1_000_000 {
        let ribuan = n / 1000;
        let sisa = n % 1000;
        if sisa == 0 {
            return format!("{} ribu", terbilang(ribuan));
        } else {
            return format!("{} ribu {}", terbilang(ribuan), terbilang(sisa));
        }
    } else if n < 1_000_000_000 {
        let jutaan = n / 1_000_000;
        let sisa = n % 1_000_000;
        if sisa == 0 {
            return format!("{} juta", terbilang(jutaan));
        } else {
            return format!("{} juta {}", terbilang(jutaan), terbilang(sisa));
        }
    } else if n < 1_000_000_000_000 {
        let miliaran = n / 1_000_000_000;
        let sisa = n % 1_000_000_000;
        if sisa == 0 {
            return format!("{} miliar", terbilang(miliaran));
        } else {
            return format!("{} miliar {}", terbilang(miliaran), terbilang(sisa));
        }
    } else {
        let triliunan = n / 1_000_000_000_000;
        let sisa = n % 1_000_000_000_000;
        if sisa == 0 {
            return format!("{} triliun", terbilang(triliunan));
        } else {
            return format!("{} triliun {}", terbilang(triliunan), terbilang(sisa));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_terbilang_basic() {
        assert_eq!(terbilang_indonesia(0), "NOL RUPIAH");
        assert_eq!(terbilang_indonesia(1), "SATU RUPIAH");
        assert_eq!(terbilang_indonesia(11), "SEBELAS RUPIAH");
        assert_eq!(terbilang_indonesia(15), "LIMA BELAS RUPIAH");
        assert_eq!(terbilang_indonesia(20), "DUA PULUH RUPIAH");
        assert_eq!(terbilang_indonesia(21), "DUA PULUH SATU RUPIAH");
        assert_eq!(terbilang_indonesia(100), "SERATUS RUPIAH");
        assert_eq!(terbilang_indonesia(101), "SERATUS SATU RUPIAH");
        assert_eq!(terbilang_indonesia(670), "ENAM RATUS TUJUH PULUH RUPIAH");
        assert_eq!(terbilang_indonesia(1000), "SERIBU RUPIAH");
        assert_eq!(terbilang_indonesia(1500), "SERIBU LIMA RATUS RUPIAH");
        assert_eq!(
            terbilang_indonesia(670000),
            "ENAM RATUS TUJUH PULUH RIBU RUPIAH"
        );
        assert_eq!(terbilang_indonesia(1000000), "SATU JUTA RUPIAH");
        assert_eq!(
            terbilang_indonesia(2500000),
            "DUA JUTA LIMA RATUS RIBU RUPIAH"
        );
    }
}
