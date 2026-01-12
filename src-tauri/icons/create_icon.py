import struct

# Create a simple 1x1 pixel ICO file
def create_simple_ico():
    # ICO header (6 bytes)
    ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type=1 (ICO), Count=1
    
    # Directory entry (16 bytes)
    w, h = 32, 32
    colors = 0  # 0 = no palette
    planes = 1
    bpp = 32
    size = 40 + w * h * 4  # BITMAPINFOHEADER + pixel data
    offset = 22  # Header (6) + Directory (16)
    
    dir_entry = struct.pack('<BBBBHHII',
                          w, h, colors, planes, bpp, size, offset)
    
    # BITMAPINFOHEADER (40 bytes)
    bih_size = 40
    bih = struct.pack('<IiiHHIIIIII',
                      bih_size, w, h*2, 1, 32,
                      0, w * h * 4, 0, 0, 0, 0)
    
    # Pixel data (32x32 gray)
    pixel_data = b'\x2D\x2D\x2D\xFF' * (w * h)  # #2d2d2d gray
    
    # Combine all parts
    ico_data = ico_header + dir_entry + bih + pixel_data
    
    return ico_data

ico_content = create_simple_ico()
with open('src-tauri/icons/icon.ico', 'wb') as f:
    f.write(ico_content)
print('Icon created!')
