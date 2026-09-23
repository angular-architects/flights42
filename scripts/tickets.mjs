// @ts-check
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import process from 'node:process';

// Issue tracker for Sandcastle (`.sandcastle/`): the tickets in `tickets/`,
// addressed by their number.
//
// Usage:
//   node scripts/tickets.mjs list        # tickets with status: ready, as JSON
//   node scripts/tickets.mjs view 001
//   node scripts/tickets.mjs close 001   # sets status: done

const TICKETS_DIR = 'tickets';
const STATUS_LINE = /^status:\s*(\S+)/m;

/**
 * @typedef {object} Ticket
 * @property {string} id
 * @property {string} path
 * @property {string} title
 * @property {string} status
 * @property {string} content
 */

const [command, id] = process.argv.slice(2);

switch (command) {
  case 'list':
    console.log(JSON.stringify(readyTickets(), null, 2));
    break;
  case 'view':
    console.log(findTicket(id).content);
    break;
  case 'close':
    markDone(findTicket(id));
    break;
  default:
    console.error(
      'Usage: node scripts/tickets.mjs list | view <id> | close <id>',
    );
    process.exit(1);
}

/** @returns {{ id: string, title: string, body: string }[]} */
function readyTickets() {
  return readTickets()
    .filter((ticket) => ticket.status === 'ready')
    .map(({ id, title, content }) => ({ id, title, body: content }));
}

/**
 * @param {string | undefined} id
 * @returns {Ticket}
 */
function findTicket(id) {
  const ticket = readTickets().find((candidate) => candidate.id === id);
  if (!ticket) {
    console.error(`No ticket ${id} in ${TICKETS_DIR}/.`);
    process.exit(1);
  }
  return ticket;
}

/** @param {Ticket} ticket */
function markDone(ticket) {
  writeFileSync(
    ticket.path,
    ticket.content.replace(STATUS_LINE, 'status: done'),
  );
}

/** @returns {Ticket[]} */
function readTickets() {
  return readdirSync(TICKETS_DIR)
    .filter((file) => /^\d+-.*\.md$/.test(file))
    .sort()
    .map((file) => readTicket(join(TICKETS_DIR, file)));
}

/**
 * @param {string} path
 * @returns {Ticket}
 */
function readTicket(path) {
  const content = readFileSync(path, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
  return {
    id: /^(\d+)-/.exec(basename(path))?.[1] ?? '',
    path,
    title: /^# (.+)$/m.exec(content)?.[1] ?? '',
    status: STATUS_LINE.exec(frontmatter)?.[1] ?? 'draft',
    content,
  };
}
