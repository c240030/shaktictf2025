key = "IWANTMOMOS"
encrypted = [':', '?', ' ', '%', ' ', '$', ',', '9', ')', '(', '+', 'c', '#', '7', '\x06', '~', '9', '\x12', '~', ' ', '\x16', '4', '4', ':', 'g', '0']

decrypted_text = ""
for i in range(len(encrypted)):
    # Perform the XOR operation to decrypt each character
    decrypted_char = chr(ord(encrypted[i]) ^ ord(key[i % len(key)]))
    decrypted_text += decrypted_char

print(f"The decrypted flag is: {decrypted_text}")
