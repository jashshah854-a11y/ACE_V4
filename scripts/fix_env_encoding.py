
import os

def fix_encoding(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found.")
        return

    content = None
    # Try reading as UTF-16 (common on Windows for PowerShell redirected output)
    try:
        with open(filename, 'r', encoding='utf-16') as f:
            content = f.read()
            # If it was actually UTF-8 but read as UTF-16, it might be garbage.
            # But 0xFF 0xFE suggests UTF-16 LE.
        print(f"Read {filename} as UTF-16.")
    except UnicodeError:
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f"Read {filename} as UTF-8 (already valid?).")
        except UnicodeError:
            pass

    # Backup logic: Try reading binary and detecting BOM
    if content is None:
        with open(filename, 'rb') as f:
            raw = f.read()
        if raw.startswith(b'\xff\xfe'):
            content = raw.decode('utf-16')
            print("Detected UTF-16 BOM.")
        elif raw.startswith(b'\xfe\xff'):
            content = raw.decode('utf-16-be')
        elif raw.startswith(b'\xef\xbb\xbf'):
            content = raw.decode('utf-8-sig')
            print("Detected UTF-8 BOM.")
        else:
            print("Unknown encoding, trying latin1")
            content = raw.decode('latin1')

    if content:
        # Write back as UTF-8 without BOM
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Converted {filename} to UTF-8.")

fix_encoding(".env")
