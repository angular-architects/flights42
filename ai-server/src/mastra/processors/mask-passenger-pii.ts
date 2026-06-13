import type {
  Processor,
  ProcessOutputStreamArgs,
} from '@mastra/core/processors';
import type { ChunkType } from '@mastra/core/stream';

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

const TARGET_TOOL = 'showComponents';

/**
 * Deterministically masks an email so the demo always produces the same,
 * obviously-redacted output (e.g. "m***@e***.com"). The result contains no
 * JSON-special characters, so it can safely be applied to a raw JSON string.
 */
function maskEmail(text: string): string {
  return text.replace(EMAIL_PATTERN, (match) => {
    const [local, domain] = match.split('@');
    if (!domain) {
      return match;
    }

    const dotIndex = domain.indexOf('.');
    const domainName = dotIndex > 0 ? domain.slice(0, dotIndex) : domain;
    const tld = dotIndex > 0 ? domain.slice(dotIndex) : '';

    const maskedLocal = `${local[0] ?? ''}***`;
    const maskedDomain = `${domainName[0] ?? ''}***`;

    return `${maskedLocal}@${maskedDomain}${tld}`;
  });
}

interface PiiStreamState {
  toolNames: Record<string, string>;
  argBuffers: Record<string, string>;
}

function getState(state: Record<string, unknown>): PiiStreamState {
  const existing = state.pii as PiiStreamState | undefined;
  if (existing) {
    return existing;
  }

  const created: PiiStreamState = { toolNames: {}, argBuffers: {} };
  state.pii = created;
  return created;
}

/**
 * The ticketing agent answers through the `showComponents` tool, so the
 * natural-language text lives inside the tool-call arguments
 * (`messageWidget.props.text`) rather than in plain `text-delta` chunks. The
 * built-in `PIIDetector` only scans `text-delta`, so it can never reach this
 * text.
 *
 * Just like the built-in detector redacts streaming text, this processor works
 * on the stream - but on the tool-call layer. The arguments arrive as many
 * small `tool-call-delta` JSON fragments (an email is split across several of
 * them), so we buffer the raw argument text per tool call and mask it once it
 * is complete at `tool-call-input-streaming-end`. We then emit the masked,
 * consolidated `tool-call` ourselves, because Mastra would otherwise rebuild it
 * from the (un-masked) deltas only *after* the processor stage.
 */
export class MaskPassengerPiiProcessor implements Processor<'mask-passenger-pii'> {
  readonly id = 'mask-passenger-pii';
  readonly name = 'Mask Passenger PII';

  async processOutputStream(
    args: ProcessOutputStreamArgs,
  ): Promise<ChunkType | null | undefined> {
    const { part, state } = args;
    const pii = getState(state);

    switch (part.type) {
      case 'tool-call-input-streaming-start': {
        const payload = part.payload as {
          toolCallId: string;
          toolName: string;
        };
        pii.toolNames[payload.toolCallId] = payload.toolName;
        return payload.toolName === TARGET_TOOL ? null : part;
      }

      case 'tool-call-delta': {
        const payload = part.payload as {
          toolCallId: string;
          toolName?: string;
          argsTextDelta?: string;
        };
        const toolName = pii.toolNames[payload.toolCallId] ?? payload.toolName;
        if (toolName !== TARGET_TOOL) {
          return part;
        }

        pii.argBuffers[payload.toolCallId] =
          (pii.argBuffers[payload.toolCallId] ?? '') +
          (payload.argsTextDelta ?? '');
        return null;
      }

      case 'tool-call-input-streaming-end': {
        const payload = part.payload as { toolCallId: string };
        if (pii.toolNames[payload.toolCallId] !== TARGET_TOOL) {
          return part;
        }

        const rawArgs = pii.argBuffers[payload.toolCallId] ?? '';
        delete pii.argBuffers[payload.toolCallId];
        delete pii.toolNames[payload.toolCallId];

        return {
          ...part,
          type: 'tool-call',
          payload: {
            toolCallId: payload.toolCallId,
            toolName: TARGET_TOOL,
            args: parseMaskedArgs(rawArgs),
          },
        } as ChunkType;
      }

      case 'tool-call': {
        const payload = part.payload as { toolName?: string; args?: unknown };
        if (payload.toolName !== TARGET_TOOL || payload.args == null) {
          return part;
        }

        payload.args = maskArgsObject(payload.args);
        return part;
      }

      default:
        return part;
    }
  }
}

/** Masks emails in the buffered raw JSON and parses it back into an object. */
function parseMaskedArgs(rawArgs: string): unknown {
  try {
    return JSON.parse(maskEmail(rawArgs));
  } catch {
    try {
      return JSON.parse(rawArgs);
    } catch {
      return {};
    }
  }
}

/** Masks emails inside an already-parsed argument object. */
function maskArgsObject(args: unknown): unknown {
  try {
    return JSON.parse(maskEmail(JSON.stringify(args)));
  } catch {
    return args;
  }
}

export const maskPassengerPiiProcessor = new MaskPassengerPiiProcessor();
