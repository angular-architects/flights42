# Check-in

Confirms that a ticket holder takes the flight and captures their contact data.

## Language

- **Ticket id**: the booked flight; `ticketId` route param, demo fallback 123456.
- **Check-in info**: ticket id + consent flag + passenger info (name, e-mail,
  address, phone).
- **Expert mode**: route input `expertMode` ("true"/"1"), unlocks extra
  fields.

## Boundaries

- No data access yet; `data/internal/` reserved and empty.
- No ticketing internals; navigates to `/next-flights` on success.

## Gotchas

- The phone number is stored without the "+43" prefix, added only for
  display.
- Signal Forms are mixed with reactive forms via the compat layer on purpose
  — do not clean up.
- Focus moves to the first empty input after the first render.
- Check-in only opens a confirmation dialog; nothing is sent to a server.
