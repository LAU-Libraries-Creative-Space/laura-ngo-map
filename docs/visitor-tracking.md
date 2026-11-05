# Visitor tracking

The GitHub Pages app shows a **shared estimate of browser visitors** using the public [Abacus counting service](https://github.com/JasonLovesDoggo/abacus). Its HTTPS API is `https://abacus.jasoncameron.dev`.

## Counting behaviour

- The Pages build adds the counter configuration to the HTML. Its namespace is `lau-libraries-creative-space`, and its key is `laura-map-visitors-20261105`.
- A first visit increments the shared counter and stores a marker in that browser. Ordinary reloads and later visits from that browser only read the count.
- The “Refresh count” button performs a read-only request. It never records an additional visit.
- Web Locks coordinate simultaneous tabs where available. A shared pending marker avoids retrying an uncertain increment after a lost response.
- If browser storage is blocked, the app reads the total without incrementing it. If the service fails, the interface reports the failure and does not fabricate a number.
- The Windows/server version retains its separate HTTP-only-cookie visitor API. Its local count is not combined with the public Pages count.

## Privacy and accuracy

The app sends only the public counter namespace and key to Abacus. It does not send names, emails, NGO selections, searches, location coordinates, donation data or persistent visitor IDs. Requests omit cookies and referrer information. As with any HTTPS service, the provider receives connection metadata such as the requesting IP address; its service policies apply.

The marker remains in the visitor's browser. Clearing browser data, using private browsing or another browser/device can count again. Blocked storage can undercount. This public aggregate counter can also receive automated or unrelated requests, so the displayed number is an estimate, not an audited measure of unique people. The external service has no institutional availability guarantee; its current implementation expires inactive keys after approximately six months, while normal reads/hits refresh their lifetime.

An institution-managed analytics backend can replace this service later without changing the NGO directory. Do not put backend credentials in GitHub Pages assets.

## Verification

The client tests cover first visits, concurrent tabs, read-only refreshes, reloads, blocked storage, failure responses and the separate server API. A live integration test uses an isolated test counter rather than increasing the production total.

References: [Abacus API routes](https://github.com/JasonLovesDoggo/abacus/blob/main/main.go), [counter implementation](https://github.com/JasonLovesDoggo/abacus/blob/main/routes.go).
