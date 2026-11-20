import { profilePhotoMaxBytes } from '$lib/env/app-env';

export const PROFILE_PHOTO_EXPORT_SIZE = 640;
export const PROFILE_PHOTO_JPEG_MIME = 'image/jpeg';
export const PROFILE_PHOTO_FILE_NAME = 'profile.jpg';

export class ProfilePhotoTooLargeError extends Error {
	constructor() {
		super('PROFILE_PHOTO_TOO_LARGE');
		this.name = 'ProfilePhotoTooLargeError';
	}
}

function loadImage(source: Blob): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(source);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('PROFILE_PHOTO_DECODE_FAILED'));
		};
		image.src = url;
	});
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('PROFILE_PHOTO_ENCODE_FAILED'));
				return;
			}
			resolve(blob);
		}, PROFILE_PHOTO_JPEG_MIME, quality);
	});
}

/** Center-crop a square JPEG, applying 90° clockwise turns, under the byte cap. */
export async function exportProfilePhotoJpeg(input: {
	source: Blob;
	rotationTurns?: number;
	maxBytes?: number;
}): Promise<File> {
	const maxBytes = input.maxBytes ?? profilePhotoMaxBytes();
	const turns = ((input.rotationTurns ?? 0) % 4 + 4) % 4;
	const image = await loadImage(input.source);
	const side = Math.min(image.naturalWidth, image.naturalHeight);
	if (side <= 0) {
		throw new Error('PROFILE_PHOTO_DECODE_FAILED');
	}
	const sx = Math.floor((image.naturalWidth - side) / 2);
	const sy = Math.floor((image.naturalHeight - side) / 2);
	const output = Math.min(PROFILE_PHOTO_EXPORT_SIZE, side);
	const canvas = document.createElement('canvas');
	canvas.width = output;
	canvas.height = output;
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('PROFILE_PHOTO_ENCODE_FAILED');
	}
	context.translate(output / 2, output / 2);
	context.rotate((turns * Math.PI) / 2);
	context.drawImage(image, sx, sy, side, side, -output / 2, -output / 2, output, output);

	const qualities = [0.92, 0.85, 0.75, 0.62, 0.5];
	let blob: Blob | undefined;
	for (const quality of qualities) {
		blob = await canvasToJpegBlob(canvas, quality);
		if (blob.size <= maxBytes) {
			break;
		}
	}
	if (!blob || blob.size > maxBytes) {
		throw new ProfilePhotoTooLargeError();
	}
	return new File([blob], PROFILE_PHOTO_FILE_NAME, { type: PROFILE_PHOTO_JPEG_MIME });
}
