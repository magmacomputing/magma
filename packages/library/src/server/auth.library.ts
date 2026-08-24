import { decodeJWT } from '../common/security/webtoken.library.js';

const MAX_TOKEN_LENGTH = 8192;															// 8 KB
const MAX_PAYLOAD_LENGTH = 4096;														// 4 KB

/**
 * Decodes a JWT payload without verifying its signature.
 * 
 * @remarks
 * **WARNING:** This function does NOT perform signature verification.
 * It strictly decodes the payload for inspection. To ensure the integrity
 * and authenticity of the token, you MUST verify the signature using
 * a trusted library (e.g., jsonwebtoken) and your secret/public key.
 * 
 * @param token - The JWT string to decode
 * @throws {Error} If the token is malformed or the payload cannot be parsed
 * @returns The parsed JSON payload of the JWT
 * @example
 * ```ts
 * const payload = decodeJWTPayload`<MyPayloadType>`(token);
 * ```
 */
export const decodeJWTPayload = <T = unknown>(token: string): T => {
	if (token.length > MAX_TOKEN_LENGTH)
		throw new Error('JWT too large: Incoming token exceeds maximum length.');

	const segments = token.split('.');

	if (segments.length !== 3)
		throw new Error('Invalid JWT format: Expected 3 segments (header.payload.signature)');

	if (segments[1].length > MAX_PAYLOAD_LENGTH)
		throw new Error('JWT payload too large: Encoded segment exceeds maximum length.');

	const decoded = decodeJWT<T>(token);
	if (!decoded)
		throw new Error('Invalid JWT payload: Decoding failed');

	return decoded;
}
