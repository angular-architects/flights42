import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

interface Hotel {
  id: string;
  name: string;
  sterne: number;
  imageUrl: string;
}

interface FindHotelsResult {
  city: string;
  hotels: Hotel[];
}

const appRootElement = document.getElementById('app');

if (!(appRootElement instanceof HTMLDivElement)) {
  throw new Error('Missing app root element.');
}

const appRoot = appRootElement;

const app = new App({
  name: 'Flights42 Hotel Finder',
  version: '1.0.0',
});

let currentCity = '';
let currentHotels: Hotel[] = [];
let isRefreshing = false;

function log(data: unknown): void {
  void app
    .sendLog({
      level: 'info',
      data,
    })
    .catch(() => undefined);
}

function readPrimaryColor(): string {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--color-ring-primary').trim() || '#3f51b5';
}

function parseResult(result: unknown): FindHotelsResult {
  const data =
    typeof result === 'object' && result
      ? 'structuredContent' in result
        ? (result as { structuredContent?: unknown }).structuredContent
        : result
      : undefined;

  if (
    data &&
    typeof data === 'object' &&
    'city' in data &&
    'hotels' in data &&
    Array.isArray((data as { hotels?: unknown[] }).hotels)
  ) {
    return {
      city: String((data as { city: unknown }).city),
      hotels: (data as { hotels: Hotel[] }).hotels,
    };
  }

  return { city: currentCity, hotels: [] };
}

function render(): void {
  const theme = document.documentElement.getAttribute('data-theme') ?? 'light';
  const primaryColor = readPrimaryColor();
  const cards = currentHotels
    .map(
      (hotel) => `
        <article class="hotel-card">
          <img src="${hotel.imageUrl}" alt="${hotel.name}" />
          <div class="hotel-card-body">
            <h3>${hotel.name}</h3>
            <p>${'★'.repeat(hotel.sterne)}${'☆'.repeat(5 - hotel.sterne)}</p>
          </div>
        </article>
      `,
    )
    .join('');

  appRoot.innerHTML = `
    <section class="shell">
      <header class="hero">
        <h2>Hotels in ${currentCity || 'your city'}</h2>
        <p>Interactive MCP App rendered inside the Flights42 chat.</p>
        <div class="meta">
          <span class="pill">darkMode: ${theme === 'dark' ? 'yes' : 'no'}</span>
          <span class="pill">primaryColor: ${primaryColor}</span>
        </div>
      </header>

      <div class="content">
        <div class="toolbar">
          <div class="status">${currentHotels.length} hotels found</div>
          <button id="refresh-hotels" ${isRefreshing ? 'disabled' : ''}>
            ${isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div class="grid">
          ${cards}
        </div>
      </div>
    </section>
  `;

  document
    .getElementById('refresh-hotels')
    ?.addEventListener('click', () => void refreshHotels());
}

async function refreshHotels(): Promise<void> {
  if (!currentCity || isRefreshing) {
    return;
  }

  isRefreshing = true;
  render();

  try {
    const result = await app.callServerTool({
      name: 'findHotels',
      arguments: { city: currentCity },
    });
    const data = parseResult(result);
    currentCity = data.city;
    currentHotels = data.hotels;
  } finally {
    isRefreshing = false;
    render();
  }
}

app.ontoolinput = ({ arguments: input }) => {
  log({ event: 'tool-input', input });
  if (input && typeof input === 'object' && 'city' in input) {
    currentCity = String((input as { city: unknown }).city);
  }
  render();
};

app.ontoolresult = (result) => {
  log({ event: 'tool-result', result });
  const data = parseResult(result);
  currentCity = data.city;
  currentHotels = data.hotels;
  render();
};

app.onhostcontextchanged = (context) => {
  if (context.theme) {
    applyDocumentTheme(context.theme);
  }

  if (context.styles?.variables) {
    applyHostStyleVariables(context.styles.variables);
  }

  render();
};

const initialContext = app.getHostContext();
if (initialContext?.theme) {
  applyDocumentTheme(initialContext.theme);
}
if (initialContext?.styles?.variables) {
  applyHostStyleVariables(initialContext.styles.variables);
}

render();
log({ event: 'app-connected' });
void app.connect();
