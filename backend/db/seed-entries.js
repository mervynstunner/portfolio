// Knowledge entries for the "Ask Mervyn" assistant. The site shows the
// title and summary of the best matches, so summaries are written for visitors.
// Edit freely, then run `npm run db:seed`.

export default [
  // ---------- Ugyard ----------
  {
    title: "Ugyard super app",
    type: "work",
    summary:
      "Ugyard is a super app for Uganda and the UAE: shopping, food delivery, rides, event tickets, stays and pay-in-instalments behind one phone sign-in and the Ugyard Money wallet.",
    content:
      "Mervyn designs and builds Ugyard end to end: the iOS and Android app, the backend services, the database design and the infrastructure. " +
      "People sign in once with their phone number and use every product from the same account and wallet. Payments run through Ugyard Money, mobile money and cards. " +
      "Businesses get their own tools inside the same app: shops manage catalogues and orders, restaurants run a kitchen queue, drivers take rides and deliveries, event hosts sell tickets and scan them at the gate, and property hosts manage rooms, prices and bookings.",
    tags: ["ugyard", "super app", "mobile", "payments", "marketplace", "uganda", "uae"],
    outcomes: [
      "One sign-in and one wallet across shopping, food, rides, tickets and stays",
      "Running in more than one country, with prices and dates per currency and time zone",
    ],
  },
  {
    title: "Ugyard architecture",
    type: "work",
    summary:
      "Ugyard runs as separate services per product on Fastify, PostgreSQL and Redis, with a React Native (Expo) app talking to a typed REST API.",
    content:
      "Each product (commerce, food, bookings, stays) is its own service with its own database schema, built on a shared platform for users, businesses, roles, notifications, search and media. Money and identity checks live in a separate, locked-down service. " +
      "Services talk through events published with an outbox on Redis Streams, so nothing is lost if a service restarts. The API is REST/JSON with schemas that generate OpenAPI docs and a typed client for the app. " +
      "Sign-in uses short access tokens with rotating session tokens and per-device sessions. Location features use PostGIS. Deploys run through GitHub Actions to a staging and a production environment.",
    tags: ["ugyard", "architecture", "fastify", "postgresql", "postgis", "redis", "react native", "expo", "microservices"],
    outcomes: ["Products can be built and deployed independently", "A typed API client keeps the app and backend in step"],
  },
  {
    title: "Holding money safely in Ugyard",
    type: "problem",
    summary:
      "Buyers pay up front, but sellers are only paid once delivery is confirmed. Ugyard holds the money in between on a double-entry ledger.",
    content:
      "A marketplace has to protect both sides: the buyer from paying for something that never arrives, and the seller from not being paid. Ugyard holds each payment until the buyer confirms delivery (or a ride, event or stay has happened), then releases it to the seller or driver. " +
      "Every movement of money is recorded on a double-entry ledger, so balances can always be reconciled. Payment requests carry idempotency keys, so a retried request or a duplicate mobile money callback can never charge someone twice.",
    tags: ["ugyard", "payments", "escrow", "ledger", "mobile money", "fintech", "reliability"],
    outcomes: ["No double charges from retries or duplicate callbacks", "Every balance traceable to ledger entries"],
  },
  {
    title: "Rides, tickets and stays in Ugyard",
    type: "work",
    summary:
      "Ugyard rides price fares on the server from routes and area rate cards; tickets use rotating QR codes that work offline at the gate; stays support hotels, guesthouses and private homes.",
    content:
      "Rides and deliveries share one driver pool. Fares are calculated on the server from the route and an area rate card, with a cap on surge pricing, and offers go to one driver at a time. Trips are confirmed with a PIN. " +
      "Event and bus tickets carry a QR code that changes every 30 seconds, so screenshots can't be resold, and the gate app keeps scanning without a connection and syncs later. " +
      "Stays cover hotels, guesthouses and private homes, with availability per room type per night, held rooms during checkout, clear cancellation policies and a front-desk check-in flow.",
    tags: ["ugyard", "rides", "deliveries", "tickets", "qr", "offline", "stays", "bookings"],
  },
  {
    title: "Building for many countries, currencies and time zones",
    type: "lesson",
    summary:
      "In Ugyard nothing assumes one country: money is stored in each currency's smallest unit and every date is cut in the person's or place's own time zone.",
    content:
      "Ugyard serves people in Uganda and the UAE, so 'today' and 'one shilling' can't be hard-coded. Amounts are stored as whole numbers in each currency's smallest unit (UGX has no cents), shown in the viewer's currency with an approximate conversion, and rides are priced in local currency only. " +
      "Daily limits, bookings and reminders are calculated in the person's or the place's own time zone, never the server's clock. The same rule caught bugs early that would otherwise have put someone a day off.",
    tags: ["ugyard", "internationalisation", "currency", "time zones", "money"],
  },

  // ---------- DX Time ----------
  {
    title: "DX Time — time and attendance",
    type: "work",
    summary:
      "DX Time is a time and attendance system. Staff clock in from a phone app or a doorway iPad kiosk that recognises them as they walk in, and managers review anything unusual before payroll.",
    content:
      "DX Time records when staff arrive and leave, feeds the hours to payroll, and flags anything that needs a manager's eye. Staff can clock in from the phone app they already use for tasks, requests and expenses, or from an iPad kiosk mounted inside the entrance. " +
      "The kiosk works in tiers: staff ID and PIN first, then face recognition on top for people who have opted in. It keeps working through a broadband outage by queueing signed punches and replaying them later. " +
      "Kiosks are provisioned, monitored and revoked from the web dashboard, and a heartbeat alerts someone if a kiosk goes quiet before it costs a shift of attendance.",
    tags: ["dx time", "time and attendance", "workforce", "kiosk", "ipad", "payroll", "face recognition"],
    outcomes: ["Clock-in without touching anything for enrolled staff", "Keeps recording through network outages"],
  },
  {
    title: "Clocking in without a queue at the door",
    type: "problem",
    summary:
      "DX Time never stops anyone at the door. Confident matches clock in instantly, uncertain ones let the person tap their name, and anything doubtful is checked by a manager afterwards.",
    content:
      "A kiosk that rejects people creates a queue, and a queue creates workarounds. DX Time handles recognition in three bands: high confidence greets the person by name and records the punch; medium confidence shows three likely names to tap, records the punch and flags it for review; low confidence asks them to use the phone app and keeps nothing. " +
      "Each tap on a suggested name is a confirmed correction, which re-enrols the person so the system adapts to new glasses, beards or winter lighting on its own. " +
      "Arrival clocks in and a sighting near the end of the shift clocks out; mid-shift sightings are ignored so timesheets stay trustworthy.",
    tags: ["dx time", "face recognition", "ux", "kiosk", "attendance"],
  },
  {
    title: "Privacy-first face recognition in DX Time",
    type: "lesson",
    summary:
      "DX Time matches faces on the iPad, only against the staff rostered at that site that day, and stores face templates encrypted so the server itself can't read them.",
    content:
      "The kiosk only compares a face with the roughly fifteen people rostered at that location today, which improves accuracy, speed and privacy at once. Templates are encrypted with keys scoped to each site, so a kiosk can only unlock its own roster and the server stores ciphertext it cannot read. " +
      "Each iPad proves it is a genuine device running the real app using Apple App Attest and signs every request with a key held in its Secure Enclave, so every punch can be traced to one device. " +
      "Enrolment records consent and the notice version shown, the camera wakes on motion instead of watching all day, and the phone app remains a full alternative for anyone who prefers not to use face recognition.",
    tags: ["dx time", "privacy", "security", "biometrics", "gdpr", "encryption", "ios"],
  },
  {
    title: "How the DX Time kiosk was built in stages",
    type: "process",
    summary:
      "The kiosk shipped first with staff ID and PIN, proving the hardware, device security and offline queue, before face recognition was layered on top.",
    content:
      "The key decision was to separate the kiosk from the face. A PIN kiosk is a complete product on its own, so it was built and run at a real site first, including a deliberate network outage and a payroll reconciliation. " +
      "Only then did the work move on to the encrypted template pipeline, recognition at the door, enrolment at the kiosk for staff without smartphones, and finally an AI layer that groups flagged punches by cause so managers make three decisions instead of twenty. " +
      "The riskiest technical unknown, device trust, was tackled first, so any redesign would happen early rather than months in.",
    tags: ["dx time", "process", "delivery", "planning", "risk"],
  },

  // ---------- DX Key ----------
  {
    title: "DX Key — team workspace",
    type: "work",
    summary:
      "DX Key is a workspace for teams across branches: encrypted chat, voice and video meetings, recordings with transcripts and summaries, file storage and search, on web and mobile.",
    content:
      "DX Key brings an organisation's conversations, calls and files into one place, scoped by organisation and branch so people only see what their role allows. Direct and group conversations are end-to-end encrypted. " +
      "Meetings run on LiveKit for voice and video, and recordings from branch and company channels are transcribed and summarised automatically. " +
      "It is built with React on the web and Expo/React Native on mobile, a Fastify API, PostgreSQL with row-level security for tenant isolation, Redis for realtime presence and messaging, S3-compatible storage and Meilisearch for search.",
    tags: ["dx key", "collaboration", "chat", "e2ee", "livekit", "video", "fastify", "postgresql", "react", "expo"],
    outcomes: ["Tenant and branch isolation enforced in the database", "Meetings transcribed and summarised automatically"],
  },
  {
    title: "Adding an AI assistant to DX Key safely",
    type: "problem",
    summary:
      "DX Key's assistant runs on Claude through an MCP server. It can only see what the requesting user can see, and it can draft emails and messages but never send them without a human click.",
    content:
      "The assistant enters the platform through exactly two doors: the core API, which gives it a short-lived token scoped to the person asking, and the database, where every query runs under the same row-level security as the app. " +
      "The model's only write tool prepares a draft. Sending is a separate endpoint that the interface calls only when a person clicks confirm, so no chain of tool calls, injected or otherwise, can reach an external inbox on its own. " +
      "Using a real MCP server rather than a one-off tool loop means the same tools also work from Claude Desktop or Claude Code for team members who want to query their own workspace.",
    tags: ["dx key", "ai", "claude", "mcp", "security", "llm", "agents"],
  },
  {
    title: "Keeping encrypted conversations encrypted",
    type: "lesson",
    summary:
      "Features like transcription and assistant messages in DX Key are designed around end-to-end encryption instead of quietly working around it.",
    content:
      "Calls inside encrypted direct or group conversations are never sent for transcription; only meetings in branch and company channels are, because sending encrypted content to a speech-to-text service would leak it through the back door. " +
      "The assistant has no device identity in the encryption scheme, so it can't produce valid encrypted messages. Instead of faking it, assistant deliveries go to a clearly labelled system channel.",
    tags: ["dx key", "e2ee", "encryption", "privacy", "security"],
  },

  // ---------- How Mervyn works ----------
  {
    title: "How Mervyn works",
    type: "process",
    summary:
      "Mervyn starts with the goal and the constraints, settles the design before writing code, then ships in small stages that each work in production on their own.",
    content:
      "Work starts by understanding what the business needs and what could go wrong, then writing down the decisions: roles and permissions, the data model, the key flows and the money paths. " +
      "Delivery is staged so the riskiest unknowns are tackled first and something useful ships early, as with the DX Time kiosk running on PIN before face recognition. " +
      "Clients get clear written design documents and plain-language explanations, and every stage has a concrete 'done when' that can be checked.",
    tags: ["process", "planning", "delivery", "communication", "architecture"],
  },
  {
    title: "Custom CRMs",
    type: "work",
    summary:
      "Mervyn has built more than thirty custom CRMs for businesses that outgrew spreadsheets and off-the-shelf tools.",
    content:
      "Each CRM is shaped around how that team actually sells, serves and follows up: customer records, pipelines, reporting and integrations with the tools they already use.",
    tags: ["crm", "custom software", "business tools", "client work"],
  },
  // ---------- Capabilities across the products ----------
  {
    title: "Face recognition and biometrics",
    type: "speciality",
    summary:
      "Mervyn has built face recognition into two products: DX Time recognises staff at a doorway iPad, and Ugyard verifies sellers with face liveness and a selfie-to-ID match.",
    content:
      "In DX Time, faces are matched on the iPad itself against only the staff rostered at that site that day, with liveness detection to stop photos being held up to the camera. Face templates are stored encrypted with per-site keys so the server can't read them, consent is recorded, and uncertain matches fall back to tapping your own name rather than blocking anyone. " +
      "In Ugyard, business and seller onboarding runs an AWS Rekognition face liveness check, then compares the live face with the photo on the person's ID document, so accounts are tied to a real, present person.",
    tags: ["face recognition", "biometrics", "liveness", "identity verification", "kyc", "aws rekognition", "dx time", "ugyard"],
  },
  {
    title: "OCR and document reading",
    type: "speciality",
    summary:
      "Ugyard reads identity and business documents with OCR (AWS Textract), so onboarding fills itself in and checks the details instead of a person retyping them.",
    content:
      "When a business signs up on Ugyard, the documents they upload, such as ID cards and trading licences, are read with AWS Textract. The extracted fields are matched against what the person entered and the face check, clear cases are approved automatically, and anything doubtful goes to a compliance queue for a person to review. Expiry dates are tracked so licences can be renewed before they lapse.",
    tags: ["ocr", "textract", "document ai", "kyc", "onboarding", "automation", "ugyard"],
  },
  {
    title: "Speech-to-text and meeting intelligence",
    type: "speciality",
    summary:
      "DX Key turns meeting recordings into transcripts and AI summaries automatically, while keeping encrypted conversations out of it.",
    content:
      "When a recorded LiveKit meeting finishes, a queue-driven worker sends the audio to a speech-to-text provider, then writes the transcript and an AI-generated summary back to the workspace, where they are searchable like any other message. " +
      "Only meetings in branch and company channels are transcribed; calls in end-to-end encrypted conversations never leave the encrypted path.",
    tags: ["speech-to-text", "voice", "transcription", "meetings", "ai summaries", "livekit", "dx key"],
  },
  {
    title: "RAG and AI assistants",
    type: "speciality",
    summary:
      "Mervyn builds AI assistants that answer from a company's own data. DX Key's Claude assistant retrieves workspace data through MCP tools under the user's own permissions.",
    content:
      "Rather than copying data into a separate AI system, the DX Key assistant retrieves what it needs at question time through an MCP server: messages, meetings, transcripts and people, filtered by the same row-level security as the app, so it only ever sees what the person asking could see. That is retrieval-augmented generation done with tools instead of a separate vector store. " +
      "Write actions are limited to drafts; anything that leaves the system needs a human click. The same approach suits internal knowledge bases, support assistants and reporting agents.",
    tags: ["rag", "retrieval augmented generation", "llm", "claude", "mcp", "agents", "ai assistant", "dx key"],
  },
  {
    title: "Geofencing and location features",
    type: "speciality",
    summary:
      "DX Time uses geofencing so phone clock-ins only count on site, and Ugyard matches drivers by distance and prices delivery by zone.",
    content:
      "In DX Time, a clock-in from the phone app is checked against the site's geofence; the doorway kiosk skips that check because its fixed position is the location proof. " +
      "In Ugyard, ride and delivery offers go to the nearest available driver, widening the search radius step by step; demand is tracked per area for surge pricing; and shops define where they deliver by country, region, radius from a location, or a drawn map area.",
    tags: ["geofencing", "location", "gps", "maps", "postgis", "driver matching", "dx time", "ugyard"],
  },
  {
    title: "Anomaly detection and fraud signals",
    type: "speciality",
    summary:
      "DX Time flags buddy punching, impossible moves between sites and changing face matches, so managers only review what's genuinely unusual.",
    content:
      "DX Time watches for patterns that point to mistakes or abuse: the same face punching twice, two PINs entered at one kiosk within seconds, or someone clocking in at two sites further apart than they could travel. " +
      "Running baselines per person and per site adapt the recognition thresholds and detect drift, prompting a re-enrolment before someone starts failing at the door. Flagged punches are clustered by likely cause so a manager makes a few decisions instead of dozens.",
    tags: ["anomaly detection", "fraud", "buddy punching", "machine learning", "attendance", "dx time"],
  },
  {
    title: "Embedded systems, IoT and hardware integration",
    type: "speciality",
    summary:
      "Mervyn builds connected systems that bridge hardware and software: sensor networks, device dashboards, real-time data pipelines and remote monitoring, from device firmware integration to the cloud.",
    content:
      "IoT work covers the whole path from the device to the people using the data: integrating with device firmware and sensors, getting readings off the device reliably over the network, processing them in real time, and presenting them in dashboards and alerts for remote monitoring. It applies to anything from a smart home setup to an industrial network. " +
      "DX Time's doorway kiosk is a hardware project in its own right: a wall-mounted iPad locked to one app through device management, woken by motion, proving its identity with a key that never leaves its secure chip, and queueing signed punches through network outages. A heartbeat raises an alert if a device goes quiet.",
    tags: ["embedded", "embedded systems", "iot", "internet of things", "hardware", "firmware", "sensors", "devices", "networking", "monitoring", "real-time"],
  },
];
