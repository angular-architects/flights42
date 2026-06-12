import type {
  McpUiHostContextChangedNotification,
  McpUiToolInputNotification,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

type HostContext = McpUiHostContextChangedNotification['params'];
type ToolInput = McpUiToolInputNotification['params'];

export interface AppViewModel {
  hostContext?: HostContext;
  toolInput?: ToolInput;
  toolResult?: CallToolResult;
  detailsVisible: boolean;
}

export function renderApp(root: HTMLElement, viewModel: AppViewModel): void {
  const hotels =
    (viewModel.toolResult?.structuredContent?.hotels as string[] | undefined) ??
    [];

  const hotelsSection = createHotelsSection(hotels);
  const detailsSection = createDetailsSection(viewModel);

  root.replaceChildren(hotelsSection, detailsSection);
}

function createHotelCard(hotelName: string): HTMLElement {
  const card = document.createElement('article');
  card.className = 'hotel-card';

  const icon = document.createElement('img');
  icon.className = 'hotel-icon';
  icon.src = 'hotel-icon.svg';
  icon.alt = '';

  const name = document.createElement('span');
  name.className = 'hotel-name';
  name.textContent = hotelName;

  card.append(icon, name);
  return card;
}

function createHotelsSection(hotels: string[]): HTMLElement {
  const hotelsDiv = document.createElement('div');
  hotelsDiv.setAttribute('name', 'hotels');

  for (const hotelName of hotels) {
    const hotelCard = createHotelCard(hotelName);
    hotelsDiv.append(hotelCard);
  }

  return hotelsDiv;
}

function createToggleButton(
  pre: HTMLPreElement,
  viewModel: AppViewModel,
): HTMLButtonElement {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'toggle-details-btn';
  toggleBtn.textContent = 'Toggle Details';

  toggleBtn.addEventListener('click', () => {
    viewModel.detailsVisible = !viewModel.detailsVisible;
    pre.hidden = !viewModel.detailsVisible;
  });

  return toggleBtn;
}

function createDetails(viewModel: AppViewModel): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.hidden = !viewModel.detailsVisible;
  pre.textContent = JSON.stringify(
    {
      hostContext: viewModel.hostContext,
      toolInput: viewModel.toolInput,
      toolResult: viewModel.toolResult,
    },
    null,
    2,
  );

  return pre;
}

function createDetailsSection(viewModel: AppViewModel): HTMLElement {
  const detailsDiv = document.createElement('div');
  detailsDiv.setAttribute('name', 'details');

  const pre = createDetails(viewModel);
  const toggleBtn = createToggleButton(pre, viewModel);

  detailsDiv.append(toggleBtn, pre);

  return detailsDiv;
}
