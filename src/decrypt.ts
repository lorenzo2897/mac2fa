import * as crypto from "crypto";

export async function decrypt(password, buffer) {
    try {
        const {iterations, salt, iv, payload} = parseBackupFile(buffer.buffer)
        const key = await deriveKey(password, iterations, salt);
        const plainText = decryptPayload(payload, key, iv);
        return plainText;
    } catch (err) {
        throw new Error(`Failed to decrypt: ${err.message}`);
    }
}

function parseBackupFile(arrayBuffer) {
    const int_length = 4;
    const salt_length = 12;
    const iv_length = 12;

    const iterBuffer = arrayBuffer.slice(0, int_length);
    // Javas ByteBuffer is Big Endian by default
    const iterations = new DataView(iterBuffer).getInt32(0, false);

    const salt = arrayBuffer.slice(int_length, int_length + salt_length);
    const iv = arrayBuffer.slice(int_length + salt_length, int_length + salt_length + iv_length);
    const payload = arrayBuffer.slice(int_length + salt_length + iv_length);

    return {
        iterations,
        salt: Buffer.from(salt),
        iv: Buffer.from(iv),
        payload: Buffer.from(payload)
    };
}

function deriveKey(password, iterations, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, iterations, 32, "sha1", (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey);
            }
        });
    })
}

function decryptPayload(payload, key, iv) {
    let decipher = crypto.createDecipheriv('AES-256-GCM', key, iv);
    // @ts-ignore
    decipher.setAuthTag(payload.slice(-16));

    let output = Buffer.concat([
        decipher.update(payload.slice(0, -16)),
        decipher.final()
    ]);

    return output.toString();
}
