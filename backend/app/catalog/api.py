import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Response
from fastapi.responses import FileResponse
import pymupdf

router = APIRouter(prefix="/api/catalog", tags=["Promo Catalog"])

# Base directories resolution
EXPLICIT_JURNAL_DIR = r"C:\Users\Khayal.Aliyev\.gemini\antigravity\scratch\tamstore-promo-intelligence\Jurnal"
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

candidate_roots = [
    EXPLICIT_JURNAL_DIR,
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "Jurnal")),
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "Jurnal")),
    os.path.abspath(os.path.join(os.getcwd(), "Jurnal")),
]

JURNAL_DIR = next((c for c in candidate_roots if os.path.exists(c) and os.path.isdir(c)), EXPLICIT_JURNAL_DIR)
ROOT_DIR = os.path.dirname(JURNAL_DIR) if JURNAL_DIR.endswith("Jurnal") else os.getcwd()
CACHE_DIR = os.path.join(ROOT_DIR, "backend", "data", "jurnal_cache")
HOTSPOTS_DIR = os.path.join(ROOT_DIR, "backend", "data", "jurnal_hotspots")

os.makedirs(JURNAL_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(HOTSPOTS_DIR, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Prevent directory traversal."""
    clean = os.path.basename(filename)
    if not clean.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Fayl yalnız .pdf formatında ola bilər")
    return clean


def get_catalog_file_path(filename: str) -> str:
    safe_name = sanitize_filename(filename)
    file_path = os.path.join(JURNAL_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"'{safe_name}' jurnalı tapılmadı")
    return file_path


def extract_smart_title(doc: pymupdf.Document, default_name: str) -> str:
    """Extract a smart human-readable title and date range from the first pages if possible."""
    try:
        if len(doc) > 0:
            first_text = doc[0].get_text()
            # Look for date patterns like '17-30 Oktyabr 2026' or '15-28 Oktyabr'
            date_match = re.search(r"(\d{1,2}\s*[-–]\s*\d{1,2}\s+[A-Za-zƏəİiIıÖöÜüĞğÇçŞş]+\s+\d{4})", first_text)
            if date_match:
                return f"TamStore Promo Jurnalı ({date_match.group(1)})"
            
            # Alternative date range pattern
            date_match_short = re.search(r"(\d{1,2}\s*[-–]\s*\d{1,2}\s+[A-Za-zƏəİiIıÖöÜüĞğÇçŞş]+)", first_text)
            if date_match_short:
                return f"TamStore Promo Jurnalı ({date_match_short.group(1)})"
    except Exception:
        pass
    
    clean_base = os.path.splitext(default_name)[0]
    if "1792059055" in clean_base or (clean_base.replace("-", "").isalnum() and len(clean_base) > 15):
        return "TamStore Promo Jurnalı (17-30 Oktyabr 2026)"
    return f"TamStore Promo Jurnalı ({clean_base})"


@router.get("/list")
def list_catalogs() -> List[Dict[str, Any]]:
    """Scan Jurnal folder and return metadata for all available PDF catalogs."""
    if not os.path.exists(JURNAL_DIR):
        return []

    pdf_files = [f for f in os.listdir(JURNAL_DIR) if f.lower().endswith(".pdf")]
    catalogs = []

    for fname in pdf_files:
        fpath = os.path.join(JURNAL_DIR, fname)
        try:
            stat = os.stat(fpath)
            size_bytes = stat.st_size
            size_mb = round(size_bytes / (1024 * 1024), 2)
            mtime = datetime.fromtimestamp(stat.st_mtime)

            doc = pymupdf.open(fpath)
            total_pages = len(doc)
            title = extract_smart_title(doc, fname)
            doc.close()

            catalogs.append({
                "id": os.path.splitext(fname)[0],
                "filename": fname,
                "title": title,
                "total_pages": total_pages,
                "size_bytes": size_bytes,
                "size_mb": size_mb,
                "modified_at": mtime.isoformat(),
                "date_label": mtime.strftime("%d.%m.%Y %H:%M"),
                "thumbnail_url": f"/api/catalog/page/{fname}/1?dpi=72"
            })
        except Exception as e:
            # Handle corrupted or locked PDF gracefully
            catalogs.append({
                "id": os.path.splitext(fname)[0],
                "filename": fname,
                "title": fname,
                "total_pages": 0,
                "size_bytes": 0,
                "size_mb": 0.0,
                "modified_at": datetime.now().isoformat(),
                "date_label": "",
                "error": str(e)
            })

    # Sort newest first
    catalogs.sort(key=lambda x: x.get("modified_at", ""), reverse=True)
    return catalogs


@router.get("/page/{filename}/{page_num}")
def get_catalog_page_image(
    filename: str,
    page_num: int,
    dpi: int = Query(130, ge=40, le=300)
):
    """Render a specific PDF page as high-resolution PNG image with disk caching."""
    fpath = get_catalog_file_path(filename)
    safe_name = os.path.basename(fpath)

    # Cache key
    cache_file = os.path.join(CACHE_DIR, f"{safe_name}_p{page_num}_dpi{dpi}.png")
    if os.path.exists(cache_file):
        with open(cache_file, "rb") as f:
            data = f.read()
        return Response(content=data, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})

    try:
        doc = pymupdf.open(fpath)
        if page_num < 1 or page_num > len(doc):
            doc.close()
            raise HTTPException(status_code=400, detail=f"Səhifə nömrəsi 1 və {len(doc)} arasında olmalıdır")

        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        doc.close()

        # Save to disk cache
        try:
            with open(cache_file, "wb") as f:
                f.write(img_bytes)
        except Exception:
            pass

        return Response(content=img_bytes, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Səhifə render edilə bilmədi: {str(e)}")


@router.get("/raw/{filename}")
def download_catalog_pdf(filename: str):
    """Serve the original PDF file directly for browser embed or download."""
    fpath = get_catalog_file_path(filename)
    return FileResponse(
        path=fpath,
        media_type="application/pdf",
        filename=os.path.basename(fpath),
        content_disposition_type="inline"
    )


@router.post("/upload")
async def upload_catalog_pdf(file: UploadFile = File(...)):
    """Upload a new catalog PDF into the Jurnal folder."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Yalnız PDF faylları qəbul edilir")

    safe_name = os.path.basename(file.filename)
    target_path = os.path.join(JURNAL_DIR, safe_name)

    # If already exists, avoid collision by appending timestamp
    if os.path.exists(target_path):
        base, ext = os.path.splitext(safe_name)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{base}_{ts}{ext}"
        target_path = os.path.join(JURNAL_DIR, safe_name)

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    # Validate that it's a valid PDF with PyMuPDF
    try:
        doc = pymupdf.open(target_path)
        total_pages = len(doc)
        title = extract_smart_title(doc, safe_name)
        doc.close()
    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=400, detail=f"PDF faylı zədələnib və ya açıla bilmir: {str(e)}")

    return {
        "success": True,
        "filename": safe_name,
        "title": title,
        "total_pages": total_pages,
        "size_mb": round(len(content) / (1024 * 1024), 2),
        "message": "Promo jurnalı uğurla yükləndi və dərc edildi"
    }


@router.get("/search/{filename}")
def search_catalog_text(filename: str, q: str = Query(..., min_length=2)):
    """Search for products or keywords across all pages of the catalog PDF."""
    fpath = get_catalog_file_path(filename)
    safe_q = q.strip().lower()

    matches = []
    try:
        doc = pymupdf.open(fpath)
        for idx, page in enumerate(doc):
            text = page.get_text()
            if safe_q in text.lower():
                # Extract surrounding snippet
                lines = [l.strip() for l in text.split("\n") if safe_q in l.lower()]
                snippet = " • ".join(lines[:3]) if lines else f"Səhifə {idx + 1}-də tapıldı"
                matches.append({
                    "page_num": idx + 1,
                    "snippet": snippet
                })
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Axtarış zamanı xəta: {str(e)}")

    return {
        "query": q,
        "total_matches": len(matches),
        "results": matches
    }


@router.get("/hotspots/{filename}")
def get_catalog_hotspots(filename: str):
    """Retrieve saved hotspot definitions for a catalog PDF."""
    safe_name = sanitize_filename(filename)
    json_path = os.path.join(HOTSPOTS_DIR, f"{safe_name}.json")
    if os.path.exists(json_path):
        try:
            import json
            with open(json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hotspot faylı oxunarkən xəta: {str(e)}")
    return {"pages": {}}


@router.post("/hotspots/{filename}")
def save_catalog_hotspots(filename: str, payload: Dict[str, Any]):
    """Save custom user-configured or calibrated hotspots for a catalog PDF."""
    safe_name = sanitize_filename(filename)
    json_path = os.path.join(HOTSPOTS_DIR, f"{safe_name}.json")
    try:
        import json
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return {"success": True, "filename": safe_name, "message": "Nöqtələr uğurla yadda saxlanıldı"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotspot faylı saxlanılarkən xəta: {str(e)}")

