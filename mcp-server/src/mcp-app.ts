import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';

interface Hotel {
  id: string;
  name: string;
  sterne: number;
  imageUrl: string;
}

interface ToolInput {
  city: string;
}

interface FindHotelsResult {
  city: string;
  hotels: Hotel[];
}

function applyHostContext(context: McpUiHostContext): void {
  if (context.theme) {
    applyDocumentTheme(context.theme);
  }

  if (context.styles?.variables) {
    applyHostStyleVariables(context.styles.variables);
  }
}

const appRoot = document.getElementById('app');

const app = new App({
  name: 'Flights42 Hotel Finder',
  version: '1.0.0',
});

let currentCity = '';
let currentHotels: Hotel[] = [];

function render(): void {
  if (!appRoot) {
    throw new Error('Missing app root element.');
  }

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
      </header>

      <div class="content">
        <div class="toolbar">
          <div class="status">${currentHotels.length} hotels found</div>
          <button id="refresh-hotels">Refresh</button>
        </div>

        <div class="grid">
          ${cards}
        </div>
      </div>
    </section>
  `;

  const refreshButton = document.getElementById('refresh-hotels');

  if (refreshButton) {
    refreshButton.addEventListener('click', () => void refreshHotels());
  }
}

async function refreshHotels(): Promise<void> {
  if (!currentCity) {
    return;
  }

  const result = await app.callServerTool({
    name: 'findHotels',
    arguments: { city: currentCity },
  });

  const data = result.structuredContent as unknown as FindHotelsResult;
  currentCity = data.city;
  currentHotels = data.hotels;
  render();
}

app.ontoolinput = (input) => {
  const args = input.arguments as unknown as ToolInput;
  currentCity = args.city;
  render();
};

app.ontoolresult = (result) => {
  const content = result.structuredContent as unknown as FindHotelsResult;
  currentCity = content.city;
  currentHotels = content.hotels;
  render();
};

render();

await app.connect();

const initialContext = app.getHostContext();
if (initialContext) {
  applyHostContext(initialContext);
}
