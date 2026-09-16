# Check-in

Check-in confirms that a passenger holding a ticket will take the flight and
captures the passenger's contact data.

## Language

- **Ticket id**: identifies the booked flight; arrives as the `ticketId` route
  parameter (the demo falls back to 123456).
- **Passenger info**: first name, last name, e-mail, address (street, zip
  code, city, country) and phone number; the phone number is stored without
  the "+43" prefix, which is added for display.
- **Conditions accepted**: the passenger's consent flag; part of every
  check-in.
- **Check-in info**: ticket id + conditions accepted + passenger info — the
  payload of a check-in.
- **Expert mode**: a route-bound input (`expertMode`) that accepts "true" or
  "1" and unlocks additional fields.

## Boundaries

- Check-in has no data access yet; `data/internal/` (confirmations,
  validation) is reserved and still empty.
- Check-in must not import ticketing internals. After a successful check-in
  it navigates to `/next-flights`; it does not render ticketing components.

## Gotchas

- The page deliberately mixes Signal Forms with reactive forms through the
  compat layer (`compatForm`, `SignalFormControl`) to show interoperability.
  Do not "clean this up".
- After the first render, focus moves to the first empty input.
- The check-in itself only opens a confirmation dialog; nothing is sent to a
  server.
