use std::sync::{Mutex, OnceLock};
use image::{GenericImageView, Rgba, RgbaImage};

static MONO_BASE: OnceLock<RgbaImage> = OnceLock::new();
static DEFAULT_ICON_RAW: OnceLock<(Vec<u8>, u32, u32)> = OnceLock::new();
static CACHED_TINT: Mutex<Option<(String, Vec<u8>, u32, u32)>> = Mutex::new(None);

const DEFAULT_ACCENT: &str = "#eb584d";

fn parse_hex_color(hex: &str) -> Option<(u8, u8, u8)> {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() == 6 {
        let r = u8::from_str_radix(&clean[0..2], 16).ok()?;
        let g = u8::from_str_radix(&clean[2..4], 16).ok()?;
        let b = u8::from_str_radix(&clean[4..6], 16).ok()?;
        Some((r, g, b))
    } else if clean.len() == 3 {
        let r = u8::from_str_radix(&clean[0..1], 16).ok()? * 17;
        let g = u8::from_str_radix(&clean[1..2], 16).ok()? * 17;
        let b = u8::from_str_radix(&clean[2..3], 16).ok()? * 17;
        Some((r, g, b))
    } else {
        None
    }
}

/// Standard Photoshop Overlay blend formula for 8-bit channels:
/// If base < 128: 2 * base * tint / 255
/// If base >= 128: 255 - 2 * (255 - base) * (255 - tint) / 255
#[inline(always)]
fn overlay_blend_channel(base: u8, tint: u8) -> u8 {
    let b = base as u32;
    let t = tint as u32;
    if b < 128 {
        ((2 * b * t + 127) / 255).min(255) as u8
    } else {
        let inv = (2 * (255 - b) * (255 - t) + 127) / 255;
        (255_u32.saturating_sub(inv)).min(255) as u8
    }
}

fn get_mono_base() -> &'static RgbaImage {
    MONO_BASE.get_or_init(|| {
        let mono_bytes = include_bytes!("../icons/noether-mono.png");
        let img = image::load_from_memory(mono_bytes).expect("Failed to load embedded noether-mono.png");
        img.to_rgba8()
    })
}

fn get_default_icon() -> &'static (Vec<u8>, u32, u32) {
    DEFAULT_ICON_RAW.get_or_init(|| {
        let orig_bytes = include_bytes!("../icons/icon.png");
        let img = image::load_from_memory(orig_bytes).expect("Failed to load embedded icon.png");
        let (w, h) = img.dimensions();
        let rgba = img.to_rgba8().into_raw();
        (rgba, w, h)
    })
}

/// Generates or retrieves cached RGBA bytes with Overlay blend for the specified accent color.
/// If the accent color is default (#eb584d), returns the original full-color icon.
pub fn generate_tinted_icon_rgba(accent_color: &str) -> (Vec<u8>, u32, u32) {
    let clean_hex = accent_color.trim().to_lowercase();
    
    // If default accent, return the original full-color icon
    if clean_hex.is_empty() || clean_hex == DEFAULT_ACCENT || clean_hex == "default" {
        let default_icon = get_default_icon();
        return (default_icon.0.clone(), default_icon.1, default_icon.2);
    }

    // Check cache
    if let Ok(guard) = CACHED_TINT.lock() {
        if let Some((cached_color, bytes, w, h)) = &*guard {
            if cached_color == &clean_hex {
                return (bytes.clone(), *w, *h);
            }
        }
    }

    let (tint_r, tint_g, tint_b) = match parse_hex_color(&clean_hex) {
        Some(rgb) => rgb,
        None => {
            let default_icon = get_default_icon();
            return (default_icon.0.clone(), default_icon.1, default_icon.2);
        }
    };

    let mono_img = get_mono_base();
    let (width, height) = mono_img.dimensions();
    let mut tinted_raw = Vec::with_capacity((width * height * 4) as usize);

    for pixel in mono_img.pixels() {
        let Rgba([r, g, b, a]) = *pixel;
        if a == 0 {
            tinted_raw.extend_from_slice(&[0, 0, 0, 0]);
        } else {
            let out_r = overlay_blend_channel(r, tint_r);
            let out_g = overlay_blend_channel(g, tint_g);
            let out_b = overlay_blend_channel(b, tint_b);
            tinted_raw.extend_from_slice(&[out_r, out_g, out_b, a]);
        }
    }

    // Save to cache
    if let Ok(mut guard) = CACHED_TINT.lock() {
        *guard = Some((clean_hex, tinted_raw.clone(), width, height));
    }

    (tinted_raw, width, height)
}

/// Creates a Tauri Image instance with the tinted icon.
pub fn create_accent_tauri_image(accent_color: &str) -> tauri::image::Image<'static> {
    let (rgba, width, height) = generate_tinted_icon_rgba(accent_color);
    tauri::image::Image::new_owned(rgba, width, height)
}
