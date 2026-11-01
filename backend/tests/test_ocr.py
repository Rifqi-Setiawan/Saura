from app.ocr.extractor import extract_kwh_from_image, parse_kwh_text
from PIL import Image, ImageDraw, ImageFont


def test_parse_kwh_text():
    val, conf = parse_kwh_text("Inverter GoodWe\nE-Today: 20.0 kWh\nE-Total: 1450 kWh")
    assert val == 20.0
    assert conf == 0.95

    val, conf = parse_kwh_text("E_Today = 20,5 kWh")
    assert val == 20.5
    assert conf == 0.95

    val, conf = parse_kwh_text("Produksi Hari Ini : 15.4 kWh")
    assert val == 15.4
    assert conf == 0.95

    val, conf = parse_kwh_text("Daily: 24 kWh")
    assert val == 24.0
    assert conf == 0.95

    val, conf = parse_kwh_text("32.5 kWh")
    assert val == 32.5
    assert conf == 0.80

    val, conf = parse_kwh_text("Random error text without numbers")
    assert val is None
    assert conf == 0.0


def test_extract_kwh_from_image():
    # Create simple synthetic test image
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    draw.text((20, 30), "E-Today: 20.0 kWh", fill=(0, 0, 0), font=font)

    res = extract_kwh_from_image(img)
    # Tesseract might read it or fallback
    assert "kwh" in res
    assert "confidence" in res
