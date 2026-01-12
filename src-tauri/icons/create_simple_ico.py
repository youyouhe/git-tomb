import struct

# Create a minimal valid ICO file with embedded PNG
# Windows Vista+ supports PNG in ICO

# PNG header for a 32x32 image
png_data = bytes.fromhex('89504e470d0a1a0a0000000d4948445200000020000002008020000000056633c900000019744458746000001000100303030000000001c4944415478daedc0010d00000c00a0f7f9d0000000049454e44ae426082')

# ICO header
header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type=1, Count=1

# Directory entry
entry = struct.pack('<BBBBHHII',
                   32, 32, 0, 0,  # w=32, h=32, colors=0, reserved=0
                   1, 32,           # planes=1, bpp=32
                   len(png_data),     # size
                   22)              # offset (6+16)

# Combine
ico = header + entry + png_data

with open('icon.ico', 'wb') as f:
    f.write(ico)
print('ICO created!')
