import { DestroyRef, inject, Injectable } from '@angular/core';
import { type AgUiChatResourceRef, agUiResource } from '@internal/ag-ui-client';

import { ConfigService } from '../../shared/util-common/config-service';
import { CheckinTicketStore } from './checkin-ticket-store';
import { fillCheckinFormClientTool } from './fill-checkin-form.tool';

/**
 * Max edge length (in CSS pixels) the uploaded ticket image is
 * downscaled to before being base64-encoded and sent to the agent.
 * Larger ⇒ more legible for vision; smaller ⇒ cheaper. 1280 px is a
 * good middle ground for most boarding passes.
 */
const MAX_IMAGE_EDGE_PX = 1280;

/** JPEG quality used by the canvas re-encode. */
const JPEG_QUALITY = 0.85;

@Injectable({ providedIn: 'root' })
export class CheckinChatService {
  private readonly config = inject(ConfigService);
  private readonly ticketStore = inject(CheckinTicketStore);
  private readonly destroyRef = inject(DestroyRef);

  // No memory: every uploaded ticket is a fresh extraction. We
  // explicitly disable server memory so previous threads can't leak
  // into this stateless flow.
  readonly chat: AgUiChatResourceRef = agUiResource({
    url: this.config.agUiUrlFor('checkinAgent'),
    model: this.config.model,
    useServerMemory: false,
    tools: [fillCheckinFormClientTool],
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.chat.dispose();
    });
  }

  /**
   * Reads the file, optionally downscales it to keep the token cost
   * under control, base64-encodes the bytes, and sends it as an
   * AG-UI multimodal user message (`text` + `image` content parts).
   */
  async submitTicketImage(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.ticketStore.setStatus(
        'error',
        'Please select an image file (PNG or JPEG).',
      );
      return;
    }

    this.ticketStore.reset();
    this.ticketStore.setStatus('uploading');

    try {
      const { base64, mimeType } = await this.fileToBase64Image(file);
      this.ticketStore.setStatus('analyzing');

      this.chat.sendMessage({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Here is my ticket or ID document. Please extract the relevant fields.',
          },
          {
            type: 'image',
            source: {
              type: 'data',
              value: base64,
              mimeType,
            },
          },
        ],
      });
    } catch (error) {
      this.ticketStore.setStatus(
        'error',
        error instanceof Error
          ? error.message
          : 'The ticket could not be processed.',
      );
    }
  }

  /**
   * Loads the file as an `HTMLImageElement`, draws it onto a canvas
   * scaled so the longer edge is at most `MAX_IMAGE_EDGE_PX`, then
   * encodes it as a JPEG base64 string (no `data:` prefix — that is
   * what AG-UI expects in `source.value`).
   *
   * Falls back to the original file bytes if the canvas pipeline is
   * unavailable (e.g. SSR or unsupported `image/*` type).
   */
  private async fileToBase64Image(
    file: File,
  ): Promise<{ base64: string; mimeType: string }> {
    if (
      typeof document === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return {
        base64: await this.readFileAsBase64(file),
        mimeType: file.type,
      };
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await this.loadImage(objectUrl);
      const { canvas, scaled } = this.drawScaled(image);

      // If we did not need to scale and the source was already a
      // common type, prefer the original bytes (no re-encode loss).
      if (
        !scaled &&
        (file.type === 'image/jpeg' || file.type === 'image/png')
      ) {
        return {
          base64: await this.readFileAsBase64(file),
          mimeType: file.type,
        };
      }

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const commaIndex = dataUrl.indexOf(',');
      const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
      return { base64, mimeType: 'image/jpeg' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The image could not be loaded.'));
      image.src = src;
    });
  }

  private drawScaled(image: HTMLImageElement): {
    canvas: HTMLCanvasElement;
    scaled: boolean;
  } {
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale =
      longestEdge > MAX_IMAGE_EDGE_PX ? MAX_IMAGE_EDGE_PX / longestEdge : 1;
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas is not supported in this browser.');
    }
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return { canvas, scaled: scale < 1 };
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('The file could not be read.'));
          return;
        }
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.readAsDataURL(file);
    });
  }
}
